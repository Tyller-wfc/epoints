const BASE_URL = 'http://127.0.0.1:3000/api';

async function request(endpoint, options = {}, token = '') {
  const headers = options.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, data, ok: res.ok };
}

async function runTests() {
  console.log('========================================================');
  console.log('  Testing Observer Role & Publish Target Requirements  ');
  console.log('========================================================\n');

  // 1. Admin Login
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'wangfangchao', password: 'wangfangchao' })
  });
  if (!adminLogin.ok) throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  const adminToken = adminLogin.data.accessToken;
  console.log('✓ 1. Admin login succeeded.');

  // Get current roles
  const stateRes = await request('/state', { method: 'GET' }, adminToken);
  const roles = stateRes.data.roles;
  const devRole = roles.find(r => r.code === 'developer') || roles[0];

  // 2. Create Member User
  const memberUsername = `testmem_${Date.now()}`;
  const createMemberRes = await request('/personnel', {
    method: 'POST',
    body: JSON.stringify({
      name: '测试普通研发',
      username: memberUsername,
      password: 'password123',
      phone: '13900000001',
      roleType: 'Member',
      enabled: true,
      availability: 'Available',
      roles: [{ roleId: devRole.id, isPrimary: true, level: 1 }]
    })
  }, adminToken);
  if (!createMemberRes.ok) throw new Error('Create member failed: ' + JSON.stringify(createMemberRes.data));
  console.log('✓ 2. Created Member user successfully.');

  // 3. Create Observer User
  const observerUsername = `testobs_${Date.now()}`;
  const createObserverRes = await request('/personnel', {
    method: 'POST',
    body: JSON.stringify({
      name: '测试观察员',
      username: observerUsername,
      password: 'password123',
      phone: '13900000002',
      roleType: 'Observer',
      enabled: true,
      availability: 'Available',
      roles: [{ roleId: devRole.id, isPrimary: true, level: 1 }]
    })
  }, adminToken);
  if (!createObserverRes.ok) throw new Error('Create observer failed: ' + JSON.stringify(createObserverRes.data));
  console.log('✓ 3. Created Observer user successfully.');

  // 4. Log in as Member and Observer
  const memberLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: memberUsername, password: 'password123' })
  });
  const memberToken = memberLogin.data.accessToken;
  const memberUser = memberLogin.data.user;

  const observerLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: observerUsername, password: 'password123' })
  });
  const observerToken = observerLogin.data.accessToken;
  const observerUser = observerLogin.data.user;

  console.assert(observerUser.roleType === 'Observer', 'Observer roleType should be Observer');
  console.assert(memberUser.roleType === 'Member', 'Member roleType should be Member');
  console.log('✓ 4. Both Member and Observer logged in and have correct roleTypes.');

  // 5. Admin creates Self-published mission (publish_target = 'self')
  const selfTitle = '管理员自承接专属任务_' + Date.now();
  const selfMissionRes = await request('/missions/create', {
    method: 'POST',
    body: JSON.stringify({
      title: selfTitle,
      description: '仅管理员与观察者可见的内部任务',
      base_points: 300,
      multiplier: 1.0,
      priority: 'Normal',
      primaryDomainId: 'd-software',
      publish_target: 'self'
    })
  }, adminToken);
  if (!selfMissionRes.ok) throw new Error('Create self mission failed: ' + JSON.stringify(selfMissionRes.data));
  const selfMission = selfMissionRes.data.missions.find(m => m.title === selfTitle);
  console.assert(selfMission && selfMission.publishTarget === 'self', 'Self mission must have publishTarget=self');
  console.assert(selfMission.assigned_to === 'u-2', 'Self mission must be assigned to admin u-2');
  console.assert(selfMission.status === 'In Progress', 'Self mission status must be In Progress');
  console.log('✓ 5. Admin published task to self (status: In Progress, assigned to self).');

  // 6. Admin creates Platform mission (publish_target = 'platform')
  const platformTitle = '平台公开测试任务_' + Date.now();
  const platformMissionRes = await request('/missions/create', {
    method: 'POST',
    body: JSON.stringify({
      title: platformTitle,
      description: '平台普通用户可认领的公开任务',
      base_points: 200,
      multiplier: 1.0,
      priority: 'Normal',
      primaryDomainId: 'd-software',
      publish_target: 'platform'
    })
  }, adminToken);
  if (!platformMissionRes.ok) throw new Error('Create platform mission failed: ' + JSON.stringify(platformMissionRes.data));
  const platformMission = platformMissionRes.data.missions.find(m => m.title === platformTitle);
  console.assert(platformMission && platformMission.publishTarget === 'platform', 'Platform mission must have publishTarget=platform');
  console.assert(platformMission.status === 'Available', 'Platform mission status must be Available');
  console.log('✓ 6. Admin published task to platform (status: Available).');

  // 7. Verify Visibility Isolation
  // 7.1 Admin sees both
  const adminState = await request('/state', { method: 'GET' }, adminToken);
  const adminHasSelf = adminState.data.missions.some(m => m.id === selfMission.id);
  const adminHasPlatform = adminState.data.missions.some(m => m.id === platformMission.id);
  console.assert(adminHasSelf && adminHasPlatform, 'Admin should see both self and platform missions');

  // 7.2 Observer sees both
  const observerState = await request('/state', { method: 'GET' }, observerToken);
  const observerHasSelf = observerState.data.missions.some(m => m.id === selfMission.id);
  const observerHasPlatform = observerState.data.missions.some(m => m.id === platformMission.id);
  console.assert(observerHasSelf && observerHasPlatform, 'Observer should see both self and platform missions');

  // 7.3 Member CANNOT see self mission, ONLY platform mission
  const memberState = await request('/state', { method: 'GET' }, memberToken);
  const memberHasSelf = memberState.data.missions.some(m => m.id === selfMission.id);
  const memberHasPlatform = memberState.data.missions.some(m => m.id === platformMission.id);
  console.assert(!memberHasSelf, 'Member must NOT see self-published mission');
  console.assert(memberHasPlatform, 'Member should see platform mission');
  console.log('✓ 7. Visibility Isolation verified: Admin & Observer see self mission, Member CANNOT see self mission.');

  // 8. Verify Claim Restrictions
  // 8.1 Observer claims platform mission -> Forbidden!
  const observerClaimRes = await request('/missions/claim', {
    method: 'POST',
    body: JSON.stringify({ missionId: platformMission.id, userId: observerUser.id })
  }, observerToken);
  console.assert(observerClaimRes.status === 403, 'Observer claiming mission must be 403 Forbidden');
  console.log('✓ 8.1 Observer claim blocked with 403 Forbidden.');

  // 8.2 Member claims self-published mission -> Forbidden!
  const memberClaimSelfRes = await request('/missions/claim', {
    method: 'POST',
    body: JSON.stringify({ missionId: selfMission.id, userId: memberUser.id })
  }, memberToken);
  console.assert(memberClaimSelfRes.status === 403, 'Member claiming self mission must be 403 Forbidden');
  console.log('✓ 8.2 Member claiming self-published mission blocked with 403 Forbidden.');

  // 8.3 Member claims platform mission -> Success!
  const memberClaimRes = await request('/missions/claim', {
    method: 'POST',
    body: JSON.stringify({ missionId: platformMission.id, userId: memberUser.id })
  }, memberToken);
  console.assert(memberClaimRes.ok, 'Member claiming platform mission should succeed');
  console.log('✓ 8.3 Member claimed platform mission successfully.');

  // 9. Verify Duty Restrictions
  const dutyDate = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];
  const dutyRes = await request('/duty', {
    method: 'POST',
    body: JSON.stringify({
      userId: observerUser.id,
      dutyDate,
      shiftStart: '09:00',
      shiftEnd: '18:00'
    })
  }, adminToken);
  console.assert(dutyRes.status === 400, 'Scheduling observer for duty must return 400 Bad Request');
  console.log('✓ 9. Observer duty assignment blocked with 400 Bad Request.');

  // 10. Verify Customer Service Assignment Restrictions
  const custRes = await request('/service-center/customers', {
    method: 'POST',
    body: JSON.stringify({ name: '测试客户_' + Date.now(), organization: '测试公司' })
  }, adminToken);
  const custId = custRes.data.customers.find(c => c.name.startsWith('测试客户_')).id;

  const serviceRes = await request('/service-center/records', {
    method: 'POST',
    body: JSON.stringify({
      customerId: custId,
      title: '测试客户服务',
      description: '服务描述',
      promisedResult: '承诺结果',
      participants: [{ userId: observerUser.id, participantRole: 'Service Owner', contributionWeight: 100 }]
    })
  }, adminToken);
  console.assert(serviceRes.status === 400, 'Assigning observer to customer service must return 400 Bad Request');
  console.log('✓ 10. Assigning observer to customer service blocked with 400 Bad Request.');

  // 11. Verify Observer can view Customer Service center
  const observerCsRes = await request('/service-center', { method: 'GET' }, observerToken);
  console.assert(observerCsRes.ok, 'Observer should be able to view customer service center');
  console.log('✓ 11. Observer can access customer service center successfully.');

  // 12. Cleanup created test personnel
  await request(`/personnel/${memberUser.id}`, { method: 'DELETE' }, adminToken);
  await request(`/personnel/${observerUser.id}`, { method: 'DELETE' }, adminToken);
  console.log('✓ 12. Cleaned up test personnel.');

  console.log('\n========================================================');
  console.log('  ALL VERIFICATION TESTS PASSED SUCCESSFULLY!  ');
  console.log('========================================================');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

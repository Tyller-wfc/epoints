const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:3000/api';
let token = '';

const results = [];

function recordResult(moduleName, caseName, success, details = '') {
  results.push({ module: moduleName, name: caseName, status: success ? 'PASS' : 'FAIL', details });
  console.log(`[${success ? 'PASS' : 'FAIL'}] ${moduleName} - ${caseName}: ${details}`);
}

async function request(endpoint, options = {}) {
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

async function runE2ETests() {
  console.log('====================================================');
  console.log(' Starting ePoints Full E2E & Functional Test Suite ');
  console.log('====================================================\n');

  const runTag = Date.now();

  // 1. Auth Module
  try {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'u2', password: 'demo123' })
    });
    if (loginRes.ok && loginRes.data.accessToken) {
      token = loginRes.data.accessToken;
      recordResult('Auth', 'Login with valid credentials', true, 'Token generated successfully');
    } else {
      recordResult('Auth', 'Login with valid credentials', false, JSON.stringify(loginRes.data));
    }

    const badLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'u2', password: 'wrongpassword' })
    });
    if (badLoginRes.status === 400 || badLoginRes.status === 401) {
      recordResult('Auth', 'Block invalid password login', true, `Blocked with HTTP ${badLoginRes.status}`);
    } else {
      recordResult('Auth', 'Block invalid password login', false, `Unexpected status ${badLoginRes.status}`);
    }

    const meRes = await request('/auth/me');
    if (meRes.ok && meRes.data.id === 'u-2') {
      recordResult('Auth', 'Get user profile (/auth/me)', true, `Authenticated as ${meRes.data.name}`);
    } else {
      recordResult('Auth', 'Get user profile (/auth/me)', false, JSON.stringify(meRes.data));
    }
  } catch (err) {
    recordResult('Auth', 'Module Test Error', false, err.message);
  }

  // 2. System State & Personnel
  try {
    const stateRes = await request('/state');
    if (stateRes.ok && stateRes.data.users && Array.isArray(stateRes.data.missions)) {
      recordResult('State', 'Fetch full system state (/state)', true, `Found ${stateRes.data.users.length} users, ${stateRes.data.missions.length} missions`);
    } else {
      recordResult('State', 'Fetch full system state (/state)', false, JSON.stringify(stateRes.data));
    }

    const personnelRes = await request('/personnel');
    if (personnelRes.ok && Array.isArray(personnelRes.data)) {
      recordResult('Personnel', 'Fetch personnel list (/personnel)', true, `Found ${personnelRes.data.length} personnel records`);
    } else {
      recordResult('Personnel', 'Fetch personnel list (/personnel)', false, JSON.stringify(personnelRes.data));
    }
  } catch (err) {
    recordResult('Personnel', 'Module Test Error', false, err.message);
  }

  // 3. Missions Board Module
  let testMissionId = '';
  const missionTitle = `自动化端到端测试任务_${runTag}`;
  try {
    const createRes = await request('/missions/create', {
      method: 'POST',
      body: JSON.stringify({
        title: missionTitle,
        description: '用于全量功能与积分流转校验的自动化测试任务',
        base_points: '50',
        primaryDomainId: 'd-software',
        category: 'Development'
      })
    });
    if (createRes.ok && createRes.data.missions) {
      const created = createRes.data.missions.find(m => m.title === missionTitle);
      if (created) testMissionId = created.id;
      recordResult('Missions', 'Create new mission (/missions/create)', true, `Mission created with ID ${testMissionId}`);
    } else {
      recordResult('Missions', 'Create new mission (/missions/create)', false, JSON.stringify(createRes.data));
    }

    if (testMissionId) {
      const claimRes = await request('/missions/claim', {
        method: 'POST',
        body: JSON.stringify({ missionId: testMissionId, userId: 'u-2' })
      });
      if (claimRes.ok) {
        recordResult('Missions', 'Claim mission (/missions/claim)', true, 'Mission claimed successfully');
      } else {
        recordResult('Missions', 'Claim mission (/missions/claim)', false, JSON.stringify(claimRes.data));
      }

      const submitRes = await request('/missions/submit', {
        method: 'POST',
        body: JSON.stringify({ missionId: testMissionId, proofText: 'PR #999 端到端用例已 100% 覆盖并通过单元测试' })
      });
      if (submitRes.ok) {
        recordResult('Missions', 'Submit mission proof of work (/missions/submit)', true, 'Mission proof submitted');
      } else {
        recordResult('Missions', 'Submit mission proof of work (/missions/submit)', false, JSON.stringify(submitRes.data));
      }

      const multRes = await request('/missions/multiplier', {
        method: 'POST',
        body: JSON.stringify({ missionId: testMissionId, newMultiplier: 1.5 })
      });
      if (multRes.ok) {
        recordResult('Missions', 'Update mission multiplier (/missions/multiplier)', true, 'Multiplier updated to 1.5x');
      } else {
        recordResult('Missions', 'Update mission multiplier (/missions/multiplier)', false, JSON.stringify(multRes.data));
      }

      const verifyRes = await request('/missions/verify', {
        method: 'POST',
        body: JSON.stringify({ missionId: testMissionId, isApproved: true })
      });
      if (verifyRes.ok) {
        recordResult('Missions', 'Verify & reward points for mission (/missions/verify)', true, 'Mission verified & points awarded');
      } else {
        recordResult('Missions', 'Verify & reward points for mission (/missions/verify)', false, JSON.stringify(verifyRes.data));
      }
    }
  } catch (err) {
    recordResult('Missions', 'Module Test Error', false, err.message);
  }

  // 4. Reward Market Module
  let testRewardId = 'r-1';
  try {
    const rewardTitle = `自动化测试限定极客挂饰_${runTag}`;
    const addRewardRes = await request('/rewards', {
      method: 'POST',
      body: JSON.stringify({
        title: rewardTitle,
        description: '自动化全流程验证专属纪念福利',
        points_cost: '50',
        category: 'Hardware',
        image: '🎁',
        inventory: '10',
        level_required: '1'
      })
    });
    if (addRewardRes.ok && addRewardRes.data.rewards) {
      const created = addRewardRes.data.rewards.find(r => r.title === rewardTitle);
      if (created) testRewardId = created.id;
      recordResult('Rewards', 'Add new reward item (/rewards)', true, `Reward added ID ${testRewardId}`);
    } else {
      recordResult('Rewards', 'Add new reward item (/rewards)', false, JSON.stringify(addRewardRes.data));
    }

    const purchaseRes = await request('/rewards/purchase', {
      method: 'POST',
      body: JSON.stringify({ rewardId: testRewardId, userId: 'u-2' })
    });
    let transactionId = '';
    if (purchaseRes.ok && purchaseRes.data.transactions) {
      const lastTx = purchaseRes.data.transactions[0];
      if (lastTx) transactionId = lastTx.id;
      recordResult('Rewards', 'Purchase reward (/rewards/purchase)', true, `Purchased successfully, tx ID ${transactionId}`);
    } else {
      recordResult('Rewards', 'Purchase reward (/rewards/purchase)', false, JSON.stringify(purchaseRes.data));
    }

    const txRes = await request('/transactions');
    if (txRes.ok && Array.isArray(txRes.data)) {
      recordResult('Rewards', 'Fetch transactions (/transactions)', true, `Found ${txRes.data.length} transactions`);
    } else {
      recordResult('Rewards', 'Fetch transactions (/transactions)', false, JSON.stringify(txRes.data));
    }

    if (transactionId) {
      const deliverRes = await request('/rewards/deliver', {
        method: 'POST',
        body: JSON.stringify({ txId: transactionId })
      });
      if (deliverRes.ok) {
        recordResult('Rewards', 'Deliver reward (/rewards/deliver)', true, 'Transaction status marked as Delivered');
      } else {
        recordResult('Rewards', 'Deliver reward (/rewards/deliver)', false, JSON.stringify(deliverRes.data));
      }
    }
  } catch (err) {
    recordResult('Rewards', 'Module Test Error', false, err.message);
  }

  // 5. Technical Support Ticket Module
  let testTicketId = '';
  try {
    const ticketTitle = `自动化测试告警_${runTag}`;
    const raiseRes = await request('/tickets/raise', {
      method: 'POST',
      body: JSON.stringify({
        title: ticketTitle,
        description: '监控检测到核心节点并发请求剧增，发起紧急排障工单流程测试',
        severity: 'Critical',
        assigned_to: 'u-2'
      })
    });
    if (raiseRes.ok && raiseRes.data.tickets) {
      const created = raiseRes.data.tickets.find(t => t.title === ticketTitle);
      if (created) testTicketId = created.id;
      recordResult('Tickets', 'Raise emergency ticket (/tickets/raise)', true, `Ticket raised ID ${testTicketId}`);
    } else {
      recordResult('Tickets', 'Raise emergency ticket (/tickets/raise)', false, JSON.stringify(raiseRes.data));
    }

    if (testTicketId) {
      const ackRes = await request('/tickets/acknowledge', {
        method: 'POST',
        body: JSON.stringify({ ticketId: testTicketId, userId: 'u-2' })
      });
      if (ackRes.ok) {
        recordResult('Tickets', 'Acknowledge ticket (/tickets/acknowledge)', true, 'Ticket acknowledged');
      } else {
        recordResult('Tickets', 'Acknowledge ticket (/tickets/acknowledge)', false, JSON.stringify(ackRes.data));
      }

      const resolveRes = await request('/tickets/resolve', {
        method: 'POST',
        body: JSON.stringify({ ticketId: testTicketId, resolutionNote: '已增加 Redis 集群读写分离节点，恢复正常' })
      });
      if (resolveRes.ok) {
        recordResult('Tickets', 'Resolve ticket (/tickets/resolve)', true, 'Ticket resolved');
      } else {
        recordResult('Tickets', 'Resolve ticket (/tickets/resolve)', false, JSON.stringify(resolveRes.data));
      }
    }
  } catch (err) {
    recordResult('Tickets', 'Module Test Error', false, err.message);
  }

  // 6. Customer Service Center Module
  let testCustomerId = '';
  let testRecordId = '';
  try {
    const custRes = await request('/service-center/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: `自动化测试集团客户_${runTag}`,
        organization: '智能云协同大客户部',
        contactName: '张经理',
        contactPhone: '13800138000',
        servicePreferences: '优先响应高优先级的保障单'
      })
    });
    if (custRes.ok && custRes.data.customers && custRes.data.customers.length > 0) {
      const lastCust = custRes.data.customers[custRes.data.customers.length - 1];
      testCustomerId = lastCust.id;
      recordResult('CustomerService', 'Create external customer (/service-center/customers)', true, `Customer created ID ${testCustomerId}`);
    } else {
      recordResult('CustomerService', 'Create external customer (/service-center/customers)', false, JSON.stringify(custRes.data));
    }

    if (testCustomerId) {
      const recRes = await request('/service-center/records', {
        method: 'POST',
        body: JSON.stringify({
          customerId: testCustomerId,
          title: `专线扩容服务_${runTag}`,
          serviceType: '运维保障',
          description: '大促期间临时提升 10G 专线接入带宽',
          promisedResult: '2 小时内完成网络调优',
          priority: 'High',
          serviceMode: 'Work Hours',
          basePoints: 300,
          participants: [
            { userId: 'u-2', participantRole: 'Service Owner', responsibility: '网络专线调优与压测保障', contributionWeight: 100 }
          ]
        })
      });
      if (recRes.ok && recRes.data.records && recRes.data.records.length > 0) {
        const lastRecord = recRes.data.records.find(r => r.customerId === testCustomerId);
        if (lastRecord) testRecordId = lastRecord.id;
        recordResult('CustomerService', 'Create service record (/service-center/records)', true, `Service record created ID ${testRecordId}`);
      } else {
        recordResult('CustomerService', 'Create service record (/service-center/records)', false, JSON.stringify(recRes.data));
      }
    }

    if (testRecordId) {
      const transRes = await request(`/service-center/records/${testRecordId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ status: 'Accepted' })
      });
      if (transRes.ok && transRes.data.records) {
        recordResult('CustomerService', 'Transition service record status', true, 'Status updated to Accepted');
      } else {
        recordResult('CustomerService', 'Transition service record status', false, JSON.stringify(transRes.data));
      }
    }
  } catch (err) {
    recordResult('CustomerService', 'Module Test Error', false, err.message);
  }

  // 7. MinIO File Storage & Avatar Service
  try {
    const sampleImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82
    ]);

    const formData = new FormData();
    const fileBlob = new Blob([sampleImageBuffer], { type: 'image/png' });
    formData.append('avatar', fileBlob, 'test_avatar.png');

    const avatarRes = await fetch(`${BASE_URL}/personnel/u-2/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const avatarData = await avatarRes.json();
    if (avatarRes.ok && avatarData.success) {
      recordResult('MinIO Storage', 'Upload user avatar to MinIO', true, `Uploaded avatar URL: ${avatarData.avatar}`);
    } else {
      recordResult('MinIO Storage', 'Upload user avatar to MinIO', false, JSON.stringify(avatarData));
    }

    const getAvatarRes = await fetch(`${BASE_URL}/personnel/u-2/avatar`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (getAvatarRes.ok) {
      const imgBuffer = Buffer.from(await getAvatarRes.arrayBuffer());
      recordResult('MinIO Storage', 'Retrieve user avatar from MinIO', true, `Retrieved ${imgBuffer.length} bytes from MinIO`);
    } else {
      recordResult('MinIO Storage', 'Retrieve user avatar from MinIO', false, `Status ${getAvatarRes.status}`);
    }
  } catch (err) {
    recordResult('MinIO Storage', 'Module Test Error', false, err.message);
  }

  // 8. Settings & Webhook Module
  try {
    const settingRes = await request('/settings/wecom', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key',
        mentionMobiles: ['13800000000']
      })
    });
    if (settingRes.ok) {
      recordResult('Settings', 'Save WeCom webhook settings (/settings/wecom)', true, 'Saved successfully');
    } else {
      recordResult('Settings', 'Save WeCom webhook settings (/settings/wecom)', false, JSON.stringify(settingRes.data));
    }
  } catch (err) {
    recordResult('Settings', 'Module Test Error', false, err.message);
  }

  console.log('\n====================================================');
  console.log(' Test Execution Summary ');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = total - passed;
  console.log(`Total Cases: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Pass Rate  : ${((passed / total) * 100).toFixed(2)}%\n`);

  fs.writeFileSync(path.join(__dirname, 'e2e-results.json'), JSON.stringify({ total, passed, failed, results }, null, 2));
}

runE2ETests();

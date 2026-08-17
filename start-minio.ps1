$env:MINIO_ROOT_USER="admin"
$env:MINIO_ROOT_PASSWORD="Admin@123456"
& "d:\epoints\minio.exe" server "d:\epoints\minio-data" --console-address ":9001" --address ":9000"

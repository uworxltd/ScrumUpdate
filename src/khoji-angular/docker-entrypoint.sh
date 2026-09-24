#!/bin/sh

echo $SERVER_NAME

# Use APP_DIST environment variable or default to /app/dist
APP_PATH=${APP_DIST:-/app/dist}

envsubst < ${APP_PATH}/assets/env.template.js > ${APP_PATH}/assets/env.js

# encode env.js (var loader holds environment variables)
binary=$(base64 -w 0 ${APP_PATH}/assets/env.js | sed 's/=*$//')
cat > ${APP_PATH}/assets/env.js <<EOF
loader="${binary}";
EOF

exec "$@"
#!/bin/sh

# Ferry Operations MQTT Broker Entrypoint

# Create password file if it doesn't exist
if [ ! -f /mosquitto/config/passwd ]; then
    echo "Creating default users..."
    touch /mosquitto/config/passwd
    
    # Create users with default passwords (change in production)
    mosquitto_passwd -b /mosquitto/config/passwd ferry_control ${FERRY_CONTROL_PASSWORD:-ferry_ctrl_pass_123}
    mosquitto_passwd -b /mosquitto/config/passwd ferry_ops ${FERRY_OPS_PASSWORD:-ferry_ops_pass_456}  
    mosquitto_passwd -b /mosquitto/config/passwd ferry_admin ${FERRY_ADMIN_PASSWORD:-ferry_admin_pass_789}
    
    echo "Users created successfully"
fi

# Ensure proper permissions
chown -R mosquitto:mosquitto /mosquitto/config /mosquitto/data /mosquitto/log
chmod 600 /mosquitto/config/passwd
chmod 644 /mosquitto/config/mosquitto.conf /mosquitto/config/acl.conf

# Start mosquitto
echo "Starting Mosquitto MQTT Broker..."
exec "$@"
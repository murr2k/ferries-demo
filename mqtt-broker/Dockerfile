FROM eclipse-mosquitto:2.0.18

# Copy custom mosquitto configuration and ACL
COPY mosquitto-simple.conf /mosquitto/config/mosquitto.conf
COPY acl.conf /mosquitto/config/acl.conf

# Copy password file (will be generated during build)
COPY passwd /mosquitto/config/passwd

# Create data and log directories
RUN mkdir -p /mosquitto/data /mosquitto/log && \
    chown -R mosquitto:mosquitto /mosquitto/data /mosquitto/log

# Expose MQTT ports
EXPOSE 1883 8883 9001

# Use custom entrypoint to ensure proper permissions
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["/usr/sbin/mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]
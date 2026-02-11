#!/usr/bin/env node

/**
 * HiveMQ Cloud Programmatic Setup for BC Ferries Telemetry
 * 
 * This script automates the configuration of your HiveMQ Cloud cluster
 * for optimal BC Ferries vessel telemetry monitoring.
 */

const axios = require('axios');
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

class HiveMQCloudSetup {
  constructor(config) {
    this.config = {
      // HiveMQ Cloud API configuration
      apiBaseUrl: 'https://console.hivemq.cloud/api/v1',
      clusterId: config.clusterId,
      apiToken: config.apiToken,
      
      // MQTT Broker configuration (existing fly.io system)
      brokerHost: config.brokerHost || 'bc-ferries-mqtt-broker.fly.dev',
      brokerPort: config.brokerPort || 9001,
      brokerProtocol: config.brokerProtocol || 'wss',
      
      // BC Ferries specific configuration
      vesselTopics: [
        'ferry/vessel/+/telemetry',
        'ferry/vessel/+/emergency/+',
        'ferry/vessel/+/status/+',
        'ferry/system/status',
        'ferry/weather/+',
        'ferry/alerts/+'
      ],
      
      // Monitoring configuration
      retentionPeriod: config.retentionPeriod || '7d',
      qosLevel: config.qosLevel || 1,
      
      ...config
    };
    
    this.apiClient = axios.create({
      baseURL: this.config.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  async setupCluster() {
    console.log('🚢 Setting up HiveMQ Cloud cluster for BC Ferries telemetry...');
    
    try {
      // Step 1: Create dedicated MQTT credentials for BC Ferries
      await this.createBCFerriesCredentials();
      
      // Step 2: Configure topic-based permissions
      await this.configureTopicPermissions();
      
      // Step 3: Set up monitoring and alerting
      await this.configureMonitoring();
      
      // Step 4: Create topic subscription configuration
      await this.createTopicConfiguration();
      
      // Step 5: Test the complete setup
      await this.testClusterSetup();
      
      console.log('✅ HiveMQ Cloud cluster setup completed successfully!');
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }
  
  async createBCFerriesCredentials() {
    console.log('🔐 Creating BC Ferries MQTT credentials...');
    
    const credentialRequests = [
      {
        username: 'bc-ferries-telemetry',
        password: this.generateSecurePassword(),
        description: 'BC Ferries vessel telemetry publishing'
      },
      {
        username: 'bc-ferries-operations',
        password: this.generateSecurePassword(), 
        description: 'BC Ferries operations dashboard monitoring'
      },
      {
        username: 'bc-ferries-emergency',
        password: this.generateSecurePassword(),
        description: 'BC Ferries emergency alerts and control'
      }
    ];
    
    for (const cred of credentialRequests) {
      try {
        const response = await this.apiClient.post(`/clusters/${this.config.clusterId}/credentials`, cred);
        console.log(`✅ Created credential: ${cred.username}`);
        
        // Store credentials securely
        this.storeCredential(cred.username, cred.password);
        
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`⚠️ Credential ${cred.username} already exists`);
        } else {
          throw error;
        }
      }
    }
  }
  
  async configureTopicPermissions() {
    console.log('📋 Configuring topic-based permissions...');
    
    const permissions = [
      {
        username: 'bc-ferries-telemetry',
        permissions: [
          { topic: 'ferry/vessel/+/telemetry', type: 'PUBLISH' },
          { topic: 'ferry/vessel/+/status/+', type: 'PUBLISH' },
          { topic: 'ferry/system/status', type: 'PUBLISH' }
        ]
      },
      {
        username: 'bc-ferries-operations', 
        permissions: [
          { topic: 'ferry/#', type: 'SUBSCRIBE' },
          { topic: 'ferry/vessel/+/control/+', type: 'PUBLISH' }
        ]
      },
      {
        username: 'bc-ferries-emergency',
        permissions: [
          { topic: 'ferry/vessel/+/emergency/+', type: 'PUBLISH' },
          { topic: 'ferry/alerts/+', type: 'PUBLISH' },
          { topic: 'ferry/#', type: 'SUBSCRIBE' }
        ]
      }
    ];
    
    for (const userPerms of permissions) {
      for (const perm of userPerms.permissions) {
        try {
          await this.apiClient.post(`/clusters/${this.config.clusterId}/users/${userPerms.username}/permissions`, {
            topic: perm.topic,
            type: perm.type,
            qos: this.config.qosLevel
          });
          
          console.log(`✅ Permission set: ${userPerms.username} -> ${perm.type} ${perm.topic}`);
        } catch (error) {
          if (error.response?.status === 409) {
            console.log(`⚠️ Permission already exists: ${perm.topic}`);
          } else {
            console.warn(`⚠️ Could not set permission: ${error.message}`);
          }
        }
      }
    }
  }
  
  async configureMonitoring() {
    console.log('📊 Configuring monitoring and metrics...');
    
    // Configure metric collection for BC Ferries topics
    const monitoringConfig = {
      topicMetrics: {
        enabled: true,
        topics: this.config.vesselTopics,
        retentionPeriod: this.config.retentionPeriod
      },
      alerting: {
        connectionThreshold: 10, // Alert if more than 10 disconnections per hour
        messageRateThreshold: 1000, // Alert if message rate exceeds 1000/min
        emergencyTopicAlert: true // Immediate alert on emergency messages
      },
      dashboard: {
        vesselStatus: true,
        emergencyAlerts: true, 
        systemHealth: true,
        messageRates: true
      }
    };
    
    // Save monitoring configuration
    this.saveMonitoringConfig(monitoringConfig);
    console.log('✅ Monitoring configuration saved');
  }
  
  async createTopicConfiguration() {
    console.log('🎯 Creating optimized topic subscription configuration...');
    
    const topicConfig = {
      name: 'BC Ferries Fleet Monitoring',
      description: 'Comprehensive BC Ferries vessel telemetry monitoring setup',
      subscriptions: this.config.vesselTopics.map(topic => ({
        topic,
        qos: this.config.qosLevel,
        color: this.getTopicColor(topic),
        filter: this.getTopicFilter(topic),
        alerts: this.getTopicAlerts(topic)
      })),
      connectionSettings: {
        host: this.config.brokerHost,
        port: this.config.brokerPort,
        protocol: this.config.brokerProtocol,
        ssl: true,
        keepAlive: 60,
        cleanSession: true,
        connectTimeout: 30000,
        tls: {
          rejectUnauthorized: true,
          servername: this.config.brokerHost
        }
      }
    };
    
    // Save topic configuration
    const configPath = path.join(__dirname, 'config', 'hivemq-topic-config.json');
    fs.writeFileSync(configPath, JSON.stringify(topicConfig, null, 2));
    
    console.log(`✅ Topic configuration saved to: ${configPath}`);
    return topicConfig;
  }
  
  async testClusterSetup() {
    console.log('🔧 Testing cluster setup...');
    
    // Test connection with BC Ferries credentials
    const testCredentials = this.loadStoredCredentials()['bc-ferries-operations'];
    
    if (!testCredentials) {
      throw new Error('Test credentials not found');
    }
    
    return new Promise((resolve, reject) => {
      const testClient = mqtt.connect(`${this.config.brokerProtocol}://${this.config.brokerHost}:${this.config.brokerPort}`, {
        username: 'bc-ferries-operations',
        password: testCredentials.password,
        clientId: `setup-test-${Date.now()}`,
        keepalive: 60,
        clean: true,
        connectTimeout: 10000,
        rejectUnauthorized: true
      });
      
      testClient.on('connect', () => {
        console.log('✅ Test connection established');
        
        // Test subscribing to all BC Ferries topics
        this.config.vesselTopics.forEach(topic => {
          testClient.subscribe(topic, { qos: this.config.qosLevel }, (err) => {
            if (err) {
              console.error(`❌ Failed to subscribe to ${topic}:`, err);
            } else {
              console.log(`✅ Successfully subscribed to: ${topic}`);
            }
          });
        });
        
        setTimeout(() => {
          testClient.end();
          resolve();
        }, 5000);
      });
      
      testClient.on('error', (error) => {
        console.error('❌ Test connection failed:', error);
        reject(error);
      });
      
      testClient.on('message', (topic, message) => {
        console.log(`📨 Test message received on ${topic}`);
      });
    });
  }
  
  generateSecurePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return Array.from({length: 24}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
  
  storeCredential(username, password) {
    const credPath = path.join(__dirname, '.credentials.json');
    let credentials = {};
    
    try {
      if (fs.existsSync(credPath)) {
        credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Warning: Could not read existing credentials');
    }
    
    credentials[username] = {
      password,
      created: new Date().toISOString()
    };
    
    fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
  }
  
  loadStoredCredentials() {
    const credPath = path.join(__dirname, '.credentials.json');
    try {
      return JSON.parse(fs.readFileSync(credPath, 'utf8'));
    } catch (error) {
      return {};
    }
  }
  
  saveMonitoringConfig(config) {
    const configDir = path.join(__dirname, 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const configPath = path.join(configDir, 'hivemq-monitoring.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  
  getTopicColor(topic) {
    const colorMap = {
      'ferry/vessel/+/telemetry': 'blue',
      'ferry/vessel/+/emergency/+': 'red', 
      'ferry/vessel/+/status/+': 'green',
      'ferry/system/status': 'purple',
      'ferry/weather/+': 'orange',
      'ferry/alerts/+': 'yellow'
    };
    
    return colorMap[topic] || 'gray';
  }
  
  getTopicFilter(topic) {
    const filterMap = {
      'ferry/vessel/+/telemetry': 'vesselId,engine.rpm,power.batterySOC,safety.fireAlarm',
      'ferry/vessel/+/emergency/+': 'vesselId,type,severity,message',
      'ferry/vessel/+/status/+': 'vesselId,operational,systems',
      'ferry/system/status': 'monitoring,connectedVessels,systemHealth',
      'ferry/weather/+': 'location,windSpeed,visibility,conditions',
      'ferry/alerts/+': 'type,severity,message'
    };
    
    return filterMap[topic] || '';
  }
  
  getTopicAlerts(topic) {
    const alertMap = {
      'ferry/vessel/+/emergency/+': { 
        enabled: true, 
        sound: true, 
        notification: true,
        priority: 'critical'
      },
      'ferry/vessel/+/telemetry': {
        enabled: true,
        conditions: [
          'safety.fireAlarm == true',
          'engine.temperature > 100',
          'power.batterySOC < 20'
        ]
      },
      'ferry/alerts/+': {
        enabled: true,
        sound: true,
        priority: 'high'
      }
    };
    
    return alertMap[topic] || { enabled: false };
  }
  
  async generateWebClientConfig() {
    console.log('🌐 Generating HiveMQ Web Client configuration...');
    
    const credentials = this.loadStoredCredentials();
    const opsCredentials = credentials['bc-ferries-operations'];
    
    if (!opsCredentials) {
      throw new Error('Operations credentials not found. Run setup first.');
    }
    
    const webClientConfig = {
      connection: {
        host: this.config.brokerHost,
        port: this.config.brokerPort,
        ssl: true,
        username: 'bc-ferries-operations',
        password: opsCredentials.password,
        keepAlive: 60,
        cleanSession: true
      },
      subscriptions: this.config.vesselTopics.map(topic => ({
        topic,
        qos: this.config.qosLevel,
        color: this.getTopicColor(topic)
      })),
      ui: {
        title: 'BC Ferries Fleet Monitor',
        theme: 'maritime',
        autoScroll: true,
        maxMessages: 1000,
        timestampFormat: 'ISO',
        messageFormat: 'json'
      }
    };
    
    // Save web client config
    const configPath = path.join(__dirname, 'config', 'web-client-config.json');
    fs.writeFileSync(configPath, JSON.stringify(webClientConfig, null, 2));
    
    console.log(`✅ Web client configuration saved to: ${configPath}`);
    return webClientConfig;
  }
}

// CLI Interface
async function main() {
  console.log('🚢 BC Ferries HiveMQ Cloud Setup Tool\n');
  
  // Configuration - replace with your actual values
  const config = {
    clusterId: process.env.HIVEMQ_CLUSTER_ID || 'your-cluster-id',
    apiToken: process.env.HIVEMQ_API_TOKEN || 'your-api-token',
    brokerHost: 'bc-ferries-mqtt-broker.fly.dev',
    brokerPort: 9001,
    brokerProtocol: 'wss'
  };
  
  // Validate required configuration
  if (config.clusterId === 'your-cluster-id' || config.apiToken === 'your-api-token') {
    console.error('❌ Missing configuration!');
    console.error('Please set environment variables:');
    console.error('  export HIVEMQ_CLUSTER_ID="your-actual-cluster-id"');
    console.error('  export HIVEMQ_API_TOKEN="your-actual-api-token"');
    console.error('\nYou can find these in your HiveMQ Cloud console.');
    process.exit(1);
  }
  
  try {
    const setup = new HiveMQCloudSetup(config);
    
    console.log('Starting automated HiveMQ Cloud setup...\n');
    
    // Run the complete setup
    await setup.setupCluster();
    
    // Generate web client configuration
    const webClientConfig = await setup.generateWebClientConfig();
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Use the generated credentials to connect your applications');
    console.log('2. Import the web client configuration for monitoring');
    console.log('3. Configure alerts and notifications as needed');
    console.log('\n📁 Configuration files saved in ./config/ directory');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = HiveMQCloudSetup;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
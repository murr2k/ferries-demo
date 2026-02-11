#!/usr/bin/env node

/**
 * HiveMQ Cloud API Integration Test
 * 
 * Tests the HiveMQ Cloud Management API integration
 * to verify programmatic configuration capabilities.
 */

const axios = require('axios');

class HiveMQApiTester {
  constructor() {
    this.apiBaseUrl = 'https://console.hivemq.cloud/api/v1';
    this.clusterId = process.env.HIVEMQ_CLUSTER_ID || 'your-cluster-id';
    this.apiToken = process.env.HIVEMQ_API_TOKEN || 'your-api-token';
    
    this.apiClient = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  async testApiConnection() {
    console.log('🔍 Testing HiveMQ Cloud API connection...');
    
    try {
      // Test basic API connectivity
      const response = await this.apiClient.get('/clusters');
      console.log('✅ API connection successful');
      console.log(`📊 Found ${response.data.length} cluster(s)`);
      
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Authentication failed - check API token');
      } else if (error.response?.status === 403) {
        console.log('❌ Access forbidden - check permissions');
      } else {
        console.log(`❌ API connection failed: ${error.message}`);
      }
      
      return false;
    }
  }
  
  async testClusterAccess() {
    console.log('🏭 Testing cluster access...');
    
    try {
      const response = await this.apiClient.get(`/clusters/${this.clusterId}`);
      console.log('✅ Cluster access successful');
      console.log(`📋 Cluster: ${response.data.name} (${response.data.status})`);
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('❌ Cluster not found - check cluster ID');
      } else {
        console.log(`❌ Cluster access failed: ${error.message}`);
      }
      
      return null;
    }
  }
  
  async testCredentialManagement() {
    console.log('🔐 Testing credential management...');
    
    try {
      // List existing credentials
      const response = await this.apiClient.get(`/clusters/${this.clusterId}/credentials`);
      console.log('✅ Credential listing successful');
      console.log(`👤 Found ${response.data.length} credential(s)`);
      
      // Test creating a test credential
      const testCred = {
        username: 'api-test-' + Date.now(),
        password: 'test-password-123',
        description: 'API integration test credential'
      };
      
      const createResponse = await this.apiClient.post(`/clusters/${this.clusterId}/credentials`, testCred);
      console.log('✅ Test credential created successfully');
      
      // Clean up test credential
      await this.apiClient.delete(`/clusters/${this.clusterId}/credentials/${testCred.username}`);
      console.log('✅ Test credential cleaned up');
      
      return true;
    } catch (error) {
      console.log(`❌ Credential management failed: ${error.message}`);
      return false;
    }
  }
  
  async testPermissionManagement() {
    console.log('🔒 Testing permission management...');
    
    try {
      // Create test user first
      const testUser = 'perm-test-' + Date.now();
      await this.apiClient.post(`/clusters/${this.clusterId}/credentials`, {
        username: testUser,
        password: 'test-pass-123',
        description: 'Permission test user'
      });
      
      // Test adding permission
      const permission = {
        topic: 'test/topic/+',
        type: 'SUBSCRIBE',
        qos: 1
      };
      
      await this.apiClient.post(`/clusters/${this.clusterId}/users/${testUser}/permissions`, permission);
      console.log('✅ Permission assignment successful');
      
      // Clean up
      await this.apiClient.delete(`/clusters/${this.clusterId}/credentials/${testUser}`);
      console.log('✅ Test user cleaned up');
      
      return true;
    } catch (error) {
      console.log(`❌ Permission management failed: ${error.message}`);
      return false;
    }
  }
  
  async generateSetupInstructions() {
    console.log('📋 Generating setup instructions...');
    
    const instructions = {
      title: 'HiveMQ Cloud API Setup Instructions',
      prerequisites: [
        'Active HiveMQ Cloud account',
        'Created cluster with WebSocket support',
        'Generated API token with cluster management permissions'
      ],
      steps: [
        {
          step: 1,
          title: 'Get Cluster Information',
          description: 'Find your cluster ID in the HiveMQ Cloud console',
          url: 'https://console.hivemq.cloud/clusters'
        },
        {
          step: 2,
          title: 'Generate API Token',
          description: 'Create API token with cluster management permissions',
          url: 'https://console.hivemq.cloud/profile/api-tokens'
        },
        {
          step: 3,
          title: 'Set Environment Variables',
          commands: [
            'export HIVEMQ_CLUSTER_ID="your-cluster-id"',
            'export HIVEMQ_API_TOKEN="your-api-token"'
          ]
        },
        {
          step: 4,
          title: 'Run Setup Script',
          commands: [
            'node hivemq-cloud-setup.js'
          ]
        }
      ],
      troubleshooting: {
        '401 Unauthorized': 'Check API token validity and permissions',
        '403 Forbidden': 'Token lacks required cluster management permissions',
        '404 Not Found': 'Verify cluster ID is correct',
        'Connection Error': 'Check internet connection and API endpoint'
      }
    };
    
    return instructions;
  }
  
  async runFullTest() {
    console.log('🚀 Running complete HiveMQ Cloud API integration test...\n');
    
    let passed = 0;
    let total = 4;
    
    // Test 1: API Connection
    if (await this.testApiConnection()) passed++;
    console.log();
    
    // Test 2: Cluster Access
    if (await this.testClusterAccess()) passed++;
    console.log();
    
    // Test 3: Credential Management
    if (await this.testCredentialManagement()) passed++;
    console.log();
    
    // Test 4: Permission Management
    if (await this.testPermissionManagement()) passed++;
    console.log();
    
    // Summary
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Passed: ${passed}/${total} tests`);
    console.log(`❌ Failed: ${total - passed}/${total} tests`);
    
    if (passed === total) {
      console.log('\n🎉 All tests passed! API integration is working correctly.');
      console.log('\n📋 Ready to run automated setup:');
      console.log('   node hivemq-cloud-setup.js');
    } else {
      console.log('\n⚠️ Some tests failed. Please check configuration.');
      const instructions = await this.generateSetupInstructions();
      console.log('\n🔧 Setup Instructions:');
      instructions.steps.forEach(step => {
        console.log(`${step.step}. ${step.title}: ${step.description}`);
        if (step.commands) {
          step.commands.forEach(cmd => console.log(`   ${cmd}`));
        }
      });
    }
    
    return passed === total;
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new HiveMQApiTester();
  tester.runFullTest().catch(console.error);
}

module.exports = HiveMQApiTester;
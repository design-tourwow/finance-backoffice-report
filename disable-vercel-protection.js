#!/usr/bin/env node

/**
 * Vercel Deployment Protection Disabler
 * This script disables deployment protection for the project
 */

const https = require('https');

// Configuration
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'YOUR_TOKEN_HERE';
const PROJECT_ID = 'prj_lclFvQ7OQdxl0y4sVSZ4yZGSI702';
const TEAM_ID = 'team_Omd0c3mPKkYe2ic0kQFljCQB';

console.log('🔧 Vercel Protection Disabler');
console.log('================================\n');

if (VERCEL_TOKEN === 'YOUR_TOKEN_HERE') {
  console.error('❌ Error: Please set VERCEL_TOKEN environment variable');
  console.log('\nUsage:');
  console.log('  VERCEL_TOKEN=your_token_here node disable-vercel-protection.js');
  process.exit(1);
}

console.log('📋 Project ID:', PROJECT_ID);
console.log('👥 Team ID:', TEAM_ID);
console.log('🔑 Token:', VERCEL_TOKEN.substring(0, 10) + '...\n');

// Function to make API request
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(response)}`));
          }
        } catch (e) {
          reject(new Error(`Parse Error: ${body}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Main function
async function disableProtection() {
  try {
    console.log('🔍 Step 1: Fetching current project settings...');
    
    // Get project details
    const project = await makeRequest('GET', `/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`);
    
    console.log('✅ Project found:', project.name);
    console.log('📊 Current protection settings:');
    
    if (project.ssoProtection) {
      console.log('   - SSO Protection:', project.ssoProtection.deploymentType || 'Not set');
    }
    
    if (project.passwordProtection) {
      console.log('   - Password Protection:', project.passwordProtection.deploymentType || 'Not set');
    }
    
    console.log('\n🔧 Step 2: Disabling deployment protection...');
    
    // Update project to disable protection
    const updateData = {
      ssoProtection: null,
      passwordProtection: null
    };
    
    const updatedProject = await makeRequest('PATCH', `/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`, updateData);
    
    console.log('✅ Protection disabled successfully!\n');
    console.log('📋 Updated settings:');
    console.log('   - SSO Protection:', updatedProject.ssoProtection || 'Disabled ✅');
    console.log('   - Password Protection:', updatedProject.passwordProtection || 'Disabled ✅');
    
    console.log('\n🎉 Done! Your project is now publicly accessible.');
    console.log('🔗 Try accessing: https://staging-finance-backoffice-report.vercel.app/tour-image-manager');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if your token has the correct permissions (Full Account)');
    console.log('   2. Verify the token is not expired');
    console.log('   3. Make sure you have access to this project');
    process.exit(1);
  }
}

// Run
disableProtection();

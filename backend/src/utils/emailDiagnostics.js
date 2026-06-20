#!/usr/bin/env node
/**
 * Email Service Diagnostic Tool
 * Run this to diagnose email configuration issues on Render
 * Usage: npm run diagnose
 */

const dns = require('dns').promises;
const net = require('net');
const nodemailer = require('nodemailer');
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkNodeVersion() {
    log('\n=== Node.js Version Check ===', 'cyan');
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    
    log(`Current Node.js version: ${version}`);
    
    if (majorVersion >= 18) {
        log('✅ Node.js version is sufficient (18+)', 'green');
        return true;
    } else {
        log(`❌ Node.js version is too old. Required: 18+, Current: ${majorVersion}`, 'red');
        log('⚠️  Update Node.js on Render via the environment settings', 'yellow');
        return false;
    }
}

async function checkEnvironmentVariables() {
    log('\n=== Environment Variables Check ===', 'cyan');
    
    const requiredVars = ['EMAIL_USER', 'EMAIL_APP_PASSWORD', 'DATABASE_URL'];
    let allPresent = true;
    
    for (const varName of requiredVars) {
        if (process.env[varName]) {
            log(`✅ ${varName} is set`, 'green');
        } else {
            log(`❌ ${varName} is missing`, 'red');
            allPresent = false;
        }
    }
    
    return allPresent;
}

async function checkDNSResolution() {
    log('\n=== DNS Resolution Check ===', 'cyan');
    
    try {
        // Check current DNS order
        if (dns.setDefaultResultOrder) {
            log('✅ dns.setDefaultResultOrder is available (Node.js 17+)', 'green');
        } else {
            log('⚠️  dns.setDefaultResultOrder not available (older Node.js)', 'yellow');
        }
        
        // Try to resolve smtp.gmail.com
        log('\nAttempting to resolve smtp.gmail.com...');
        const addresses = await dns.resolve4('smtp.gmail.com');
        log(`✅ IPv4 resolution successful: ${addresses.join(', ')}`, 'green');
        
        // Try IPv6 too for comparison
        try {
            const ipv6Addresses = await dns.resolve6('smtp.gmail.com');
            log(`ℹ️  IPv6 addresses also available: ${ipv6Addresses.slice(0, 2).join(', ')}`, 'blue');
        } catch (err) {
            log(`ℹ️  IPv6 resolution not available (expected on some systems)`, 'blue');
        }
        
        return true;
    } catch (error) {
        log(`❌ DNS resolution failed: ${error.message}`, 'red');
        return false;
    }
}

async function checkSMTPConnectivity() {
    log('\n=== SMTP Connectivity Check ===', 'cyan');
    
    return new Promise((resolve) => {
        log('Attempting to connect to smtp.gmail.com:587...');
        
        const socket = net.createConnection({ host: 'smtp.gmail.com', port: 587 });
        let connected = false;
        
        const timeout = setTimeout(() => {
            if (!connected) {
                log('❌ Connection timeout (>5s)', 'red');
                socket.destroy();
                resolve(false);
            }
        }, 5000);
        
        socket.on('connect', () => {
            connected = true;
            clearTimeout(timeout);
            log('✅ TCP connection successful', 'green');
            socket.destroy();
            resolve(true);
        });
        
        socket.on('error', (error) => {
            clearTimeout(timeout);
            log(`❌ Connection failed: ${error.code} - ${error.message}`, 'red');
            resolve(false);
        });
    });
}

async function checkNodemailerConfiguration() {
    log('\n=== Nodemailer Configuration Check ===', 'cyan');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        log('❌ Missing EMAIL_USER or EMAIL_APP_PASSWORD', 'red');
        return false;
    }
    
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        family: 4,
        connectionTimeout: 10000,
        socketTimeout: 10000,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });
    
    try {
        log('Verifying Nodemailer transporter connection...');
        await transporter.verify();
        log('✅ Nodemailer transporter verification successful', 'green');
        log(`📧 Connected as: ${process.env.EMAIL_USER}`, 'blue');
        return true;
    } catch (error) {
        log(`❌ Nodemailer transporter verification failed:`, 'red');
        log(`   Code: ${error.code}`, 'red');
        log(`   Message: ${error.message}`, 'red');
        
        if (error.code === 'EAUTH') {
            log('   ℹ️  Authentication failed. Check EMAIL_USER and EMAIL_APP_PASSWORD', 'yellow');
        } else if (error.code === 'ENETUNREACH') {
            log('   ℹ️  Network unreachable. Check if IPv6 DNS is interfering', 'yellow');
        } else if (error.code === 'ETIMEDOUT') {
            log('   ℹ️  Connection timeout. Gmail SMTP port 587 might be blocked', 'yellow');
        }
        
        return false;
    }
}

async function testEmailSending() {
    log('\n=== Email Sending Test ===', 'cyan');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        log('⏭️  Skipping email send test (missing credentials)', 'yellow');
        return false;
    }
    
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        family: 4,
        connectionTimeout: 10000,
        socketTimeout: 10000,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });
    
    try {
        log('Sending test email...');
        const info = await transporter.sendMail({
            from: `"Organizo Diagnostic" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to self for testing
            subject: 'Organizo - Email Service Test',
            html: '<h1>Email Service Test</h1><p>If you received this, email is working on Render!</p>',
        });
        
        log(`✅ Test email sent successfully`, 'green');
        log(`   Message ID: ${info.messageId}`, 'blue');
        return true;
    } catch (error) {
        log(`❌ Failed to send test email:`, 'red');
        log(`   Code: ${error.code}`, 'red');
        log(`   Message: ${error.message}`, 'red');
        return false;
    }
}

async function runDiagnostics() {
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║     ORGANIZO EMAIL SERVICE DIAGNOSTIC TOOL            ║', 'cyan');
    log('║     Run this on Render to diagnose email issues       ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');
    
    const results = {
        nodeVersion: await checkNodeVersion(),
        envVars: await checkEnvironmentVariables(),
        dnsResolution: await checkDNSResolution(),
        smtpConnectivity: await checkSMTPConnectivity(),
        nodemailerConfig: await checkNodemailerConfiguration(),
        emailSending: null, // Only run if config is valid
    };
    
    if (results.nodemailerConfig) {
        results.emailSending = await testEmailSending();
    }
    
    // Summary
    log('\n=== Diagnostic Summary ===', 'cyan');
    const allPassed = Object.values(results).every(r => r !== null && r === true);
    
    if (allPassed) {
        log('✅ All checks passed! Email service should be working.', 'green');
    } else {
        log('❌ Some checks failed. See details above.', 'red');
        
        log('\n=== Recommended Actions ===', 'yellow');
        if (!results.nodeVersion) {
            log('1. Update Node.js to 18+ in Render environment settings', 'yellow');
        }
        if (!results.envVars) {
            log('2. Verify environment variables on Render (check screenshot)', 'yellow');
        }
        if (!results.dnsResolution) {
            log('3. DNS resolution issue - may require Render support', 'yellow');
        }
        if (!results.smtpConnectivity) {
            log('4. SMTP connectivity blocked - may be Render firewall/VPC issue', 'yellow');
        }
        if (!results.nodemailerConfig) {
            log('5. Check Gmail app password - verify it\'s correct', 'yellow');
            log('   - Login to gmail.com → 2-Step Verification → App passwords', 'yellow');
            log('   - Generate a new app password for Organizo', 'yellow');
        }
    }
    
    log('\n');
    process.exit(allPassed ? 0 : 1);
}

// Run diagnostics
runDiagnostics().catch(error => {
    log(`\nFatal error: ${error.message}`, 'red');
    process.exit(1);
});

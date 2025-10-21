#!/usr/bin/env node

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const POSTMAN_COLLECTION = {
  info: {
    name: 'Rellio API Collection',
    description: 'Complete API collection for Rellio - Multi-faith spiritual sanctuary platform',
    version: '1.0.0',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [
      {
        key: 'token',
        value: '{{auth_token}}',
        type: 'string',
      },
    ],
  },
  variable: [
    {
      key: 'base_url',
      value: 'http://localhost:5000',
      type: 'string',
    },
    {
      key: 'auth_token',
      value: '',
      type: 'string',
    },
    {
      key: 'session_id',
      value: '',
      type: 'string',
    },
  ],
  item: [
    {
      name: 'Health & Status',
      item: [
        {
          name: 'Health Check',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/health',
              host: ['{{base_url}}'],
              path: ['health'],
            },
          },
        },
      ],
    },
    {
      name: 'Authentication',
      item: [
        {
          name: 'Signup',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                email: 'user@example.com',
                username: 'testuser',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
              }, null, 2),
            },
            url: {
              raw: '{{base_url}}/api/auth/signup',
              host: ['{{base_url}}'],
              path: ['api', 'auth', 'signup'],
            },
          },
        },
        {
          name: 'Login',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                email: 'user@example.com',
                password: 'password123',
              }, null, 2),
            },
            url: {
              raw: '{{base_url}}/api/auth/login',
              host: ['{{base_url}}'],
              path: ['api', 'auth', 'login'],
            },
          },
        },
      ],
    },
    {
      name: 'Scripture',
      item: [
        {
          name: 'Get Religions',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/religions',
              host: ['{{base_url}}'],
              path: ['api', 'religions'],
            },
          },
        },
        {
          name: 'Get Books by Religion',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/religions/islam/books',
              host: ['{{base_url}}'],
              path: ['api', 'religions', 'islam', 'books'],
            },
          },
        },
        {
          name: 'Get Scripture Verses',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/scriptures?religion=islam&book=quran&chapter=1',
              host: ['{{base_url}}'],
              path: ['api', 'scriptures'],
              query: [
                { key: 'religion', value: 'islam' },
                { key: 'book', value: 'quran' },
                { key: 'chapter', value: '1' },
              ],
            },
          },
        },
        {
          name: 'Get Random Verse',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/verse/random',
              host: ['{{base_url}}'],
              path: ['api', 'verse', 'random'],
            },
          },
        },
      ],
    },
    {
      name: 'AI Chat',
      item: [
        {
          name: 'Send Chat Message',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                message: 'What is the meaning of Al-Fatiha?',
                sessionId: '{{session_id}}',
                context: {
                  religion: 'islam',
                  book: 'quran',
                  chapter: 1,
                  persona: 'islamic_mufti',
                },
              }, null, 2),
            },
            url: {
              raw: '{{base_url}}/api/chat',
              host: ['{{base_url}}'],
              path: ['api', 'chat'],
            },
          },
        },
        {
          name: 'Compare Across Religions',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                theme: 'compassion',
                sessionId: '{{session_id}}',
                maxVersesPerReligion: 3,
              }, null, 2),
            },
            url: {
              raw: '{{base_url}}/api/compare',
              host: ['{{base_url}}'],
              path: ['api', 'compare'],
            },
          },
        },
      ],
    },
    {
      name: 'Reading Progress',
      item: [
        {
          name: 'Track Reading',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                religion: 'islam',
                book: 'quran',
                chapter: 1,
              }, null, 2),
            },
            url: {
              raw: '{{base_url}}/api/readings',
              host: ['{{base_url}}'],
              path: ['api', 'readings'],
            },
          },
        },
        {
          name: 'Start Reading Session',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                religion: 'islam',
                book: 'quran',
                chapter: 1,
              }, null, 2),
            },
            url: {
              raw: '{{base_url}}/api/progress/session/start',
              host: ['{{base_url}}'],
              path: ['api', 'progress', 'session', 'start'],
            },
          },
        },
      ],
    },
    {
      name: 'GDPR & Privacy',
      item: [
        {
          name: 'Submit Consent',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                region: 'EU',
                accepted: true,
                version: '1.0',
              }, null, 2),
            },
            url: {
              raw: '{{base_url}}/api/gdpr/consent',
              host: ['{{base_url}}'],
              path: ['api', 'gdpr', 'consent'],
            },
          },
        },
        {
          name: 'Get User Consent',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/gdpr/consent',
              host: ['{{base_url}}'],
              path: ['api', 'gdpr', 'consent'],
            },
          },
        },
      ],
    },
    {
      name: 'Metrics & Analytics',
      item: [
        {
          name: 'Track Event',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                eventType: 'voice_interrupt',
                eventData: {
                  sessionId: '{{session_id}}',
                  timestamp: new Date().toISOString(),
                },
              }, null, 2),
            },
            url: {
              raw: '{{base_url}}/api/metrics/track',
              host: ['{{base_url}}'],
              path: ['api', 'metrics', 'track'],
            },
          },
        },
      ],
    },
    {
      name: 'Voice WebSocket',
      item: [
        {
          name: 'WebSocket Voice Connection',
          request: {
            description: 'WebSocket connection for real-time voice interaction. Use a WebSocket client to connect.\n\nConnection URL: ws://localhost:5000/ws/voice\n\nMessage format:\n{\n  "type": "start" | "stop" | "interrupt" | "heartbeat",\n  "data": {...}\n}',
            method: 'GET',
            header: [],
            url: {
              raw: 'ws://localhost:5000/ws/voice',
              protocol: 'ws',
              host: ['localhost'],
              port: '5000',
              path: ['ws', 'voice'],
            },
          },
        },
      ],
    },
  ],
};

async function createPostmanCollection() {
  try {
    // Ensure output directory exists
    try {
      await mkdir('dist', { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
    
    const outputPath = 'postman_collection.json';
    
    console.log('📮 Creating Postman collection...');
    
    await writeFile(
      outputPath,
      JSON.stringify(POSTMAN_COLLECTION, null, 2),
      'utf8'
    );
    
    console.log(`✅ Successfully created Postman collection`);
    console.log(`📍 Location: ${outputPath}`);
    console.log(`\nImport this file into Postman to test all Rellio API endpoints.`);
    console.log(`\nKey features:`);
    console.log(`  • ${POSTMAN_COLLECTION.item.length} endpoint categories`);
    console.log(`  • Authentication flows`);
    console.log(`  • Scripture access`);
    console.log(`  • AI chat and comparison`);
    console.log(`  • Reading progress tracking`);
    console.log(`  • GDPR compliance`);
    console.log(`  • WebSocket voice connection info`);
    
  } catch (error) {
    console.error('❌ Error creating Postman collection:', error);
    process.exit(1);
  }
}

// Run the export
createPostmanCollection();

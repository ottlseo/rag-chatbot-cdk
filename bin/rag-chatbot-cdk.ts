#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebStack } from '../lib/webStack/webStack';

const STACK_PREFIX = "RAGChatBot";
const DEFAULT_REGION = "us-west-2";

const app = new cdk.App();

const webStack = new WebStack(app, `${STACK_PREFIX}-EC2Stack`, {
  knowledgeBaseId: 'your-knowledge-base-id',
  env: {
      account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
      region: DEFAULT_REGION,
    },
});

app.synth();

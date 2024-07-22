#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SyncKnowledgeBaseStack } from '../lib/syncKnowledgeBaseStack/syncKnowledgeBaseStack';
import { QueryKnowledgeBaseStack } from '../lib/queryKnowledgeBaseStack/queryKnowledgeBaseStack';
import { WebStack } from '../lib/webStack/webStack';

const STACK_PREFIX = "RAG-ChatBot";
const DEFAULT_REGION = "us-west-2";
const envSetting = {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: DEFAULT_REGION,
  },
};

const app = new cdk.App();

const syncStack = new SyncKnowledgeBaseStack(app, `${STACK_PREFIX}-SyncKnowledgeBaseStack`, {});

const queryStack = new QueryKnowledgeBaseStack(app, `${STACK_PREFIX}-QueryKnowledgeBaseStack`, {
    customKnowledgeBaseId: syncStack.CustomKnowledgeBaseId,
    defaultKnowledgeBaseId: syncStack.DefaultKnowledgeBaseId,
});
queryStack.addDependency(syncStack);

const webStack = new WebStack(app, `${STACK_PREFIX}-WebStack`, envSetting);
webStack.addDependency(queryStack);

app.synth();

#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SyncKnowledgeBaseStack } from '../lib/syncKnowledgeBaseStack/syncKnowledgeBaseStack';
import { QueryKnowledgeBaseStack } from '../lib/queryKnowledgeBaseStack/queryKnowledgeBaseStack';
import { WebStack } from '../lib/webStack/webStack';

const STACK_PREFIX = "RAGChatBot";
const DEFAULT_REGION = "us-west-2";

const app = new cdk.App();

const syncStack = new SyncKnowledgeBaseStack(app, `${STACK_PREFIX}-SyncKnowledgeBaseStack`, {
    env: {
        account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
        region: DEFAULT_REGION,
      },
});

const queryStack = new QueryKnowledgeBaseStack(app, `${STACK_PREFIX}-QueryKnowledgeBaseStack`, {
    customKnowledgeBaseId: cdk.Fn.importValue('CustomKnowledgeBaseId'),
    defaultKnowledgeBaseId: cdk.Fn.importValue('DefaultKnowledgeBaseId'),
    env: {
        account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
        region: DEFAULT_REGION,
      },
});
queryStack.addDependency(syncStack);

const webStack = new WebStack(app, `${STACK_PREFIX}-WebStack`, {
    api_url_base: cdk.Fn.importValue('ApiGatewayEndpoint'),
    custom_file_bucket: cdk.Fn.importValue('CustomFileBucketName'),
    default_file_bucket: cdk.Fn.importValue('DefaultFileBucketName'),
    env: {
        account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
        region: DEFAULT_REGION,
      },
});
webStack.addDependency(queryStack);

app.synth();

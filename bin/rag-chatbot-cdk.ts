#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KnowledgeBaseApiStack } from '../lib/knowledgeBaseApiStack/knowledgeBaseApiStack';
import { WebStack } from '../lib/webStack/webStack';

const STACK_PREFIX = "RAGChatBot";
const DEFAULT_REGION = "us-west-2";

const app = new cdk.App();

const apiStack = new KnowledgeBaseApiStack(app, `${STACK_PREFIX}-KnowledgeBaseApiStack`, {});

const webStack = new WebStack(app, `${STACK_PREFIX}-WebStack`, {
    api_url_base: apiStack.ApiGatewayEndpoint,
    custom_file_bucket: apiStack.CustomFileBucketName,
    default_file_bucket: apiStack.DefaultFileBucketName,
    env: {
        account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
        region: DEFAULT_REGION,
      },
});
webStack.addDependency(apiStack);

app.synth();

#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IndexingDocumentStack } from '../lib/indexingDocumentStack/indexingDocumentStack';

const app = new cdk.App();
new IndexingDocumentStack(app, 'IndexingDocumentStack', {
});

app.synth();

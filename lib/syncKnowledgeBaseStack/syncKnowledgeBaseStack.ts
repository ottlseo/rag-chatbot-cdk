import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export class SyncKnowledgeBaseStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 버킷 생성
    const randomstr = Math.random().toString(36).substring(2,8);
    const bucket = new s3.Bucket(this, 'KnowledgeBaseFilesBucket', {
        bucketName: `knowledge-base-bucket-demogo-${randomstr}`,
        autoDeleteObjects: true, // 버킷 내 객체를 자동으로 삭제
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    
    const knowledgeBase = new bedrock.KnowledgeBase(
      this,
      "bedrock-knowledge-base-demogo",
      {
          embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
      }
    );

    const dataSource = new bedrock.S3DataSource(
        this, 
        "data-source-demogo",
        {
            bucket: bucket,
            knowledgeBase: knowledgeBase,
            dataSourceName: "data-source-demogo",
            chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
            maxTokens: 500,
            overlapPercentage: 20,
        }
    );
        
    const s3PutEventSource = new S3EventSource(bucket, {
      events: [s3.EventType.OBJECT_CREATED_PUT],
    });
  
    const lambdaIngestionJob = new lambda.Function(this, "IngestionJob", {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "injestJobLambda.handler",
        code: lambda.Code.fromAsset("./lib/syncKnowledgeBaseStack"),
        timeout: cdk.Duration.minutes(5),
        environment: {
          KNOWLEDGE_BASE_ID: knowledgeBase.knowledgeBaseId,
          DATA_SOURCE_ID: dataSource.dataSourceId,
        },
    });

    // S3 event 발생 시 IngestJob lambda trigger
    lambdaIngestionJob.addEventSource(s3PutEventSource);

    lambdaIngestionJob.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:StartIngestionJob"],
        resources: [knowledgeBase.knowledgeBaseArn],
      })
    );
 
    /** ===== Default docs setting ===== */

    const bucketForDefaultDoc = new s3.Bucket(this, 'KnowledgeBaseFilesBucketForDefaultDoc', {
      bucketName: `knowledge-base-bucket-demogo-${randomstr}-for-default-doc`,
      autoDeleteObjects: true, // 버킷 내 객체를 자동으로 삭제
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // upload sample data in advance
    new cdk.aws_s3_deployment.BucketDeployment(this, 'DeployDefaultDoc', {
      sources: [cdk.aws_s3_deployment.Source.asset('./lib/syncKnowledgeBaseStack/data')],
      destinationBucket: bucketForDefaultDoc
    });

    bucketForDefaultDoc.addToResourcePolicy( // allow to auto-delete
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudformation.amazonaws.com')],
        actions: ['s3:DeleteBucket'],
        resources: [bucketForDefaultDoc.bucketArn],
      })
    );

    const knowledgeBaseForDefaultDoc = new bedrock.KnowledgeBase(
      this,
      "bedrock-knowledge-base-demogo-default",
      {
          embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
      }
    );
    const dataSourceForDefaultDoc = new bedrock.S3DataSource(
      this, 
      "data-source-demogo-ForDefaultDoc",
      {
          bucket: bucketForDefaultDoc,
          knowledgeBase: knowledgeBaseForDefaultDoc,
          dataSourceName: "data-source-demogo-ForDefaultDoc",
          chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
          maxTokens: 500,
          overlapPercentage: 20,
      }
    );

    const s3PutEventSourceForDefaultDoc = new S3EventSource(bucketForDefaultDoc, {
        events: [s3.EventType.OBJECT_CREATED_PUT],
      });

    const lambdaIngestionJobForDefaultDoc = new lambda.Function(this, "IngestionJobForDefaultDoc", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "injestJobLambda.handler",
      code: lambda.Code.fromAsset("./lib/syncKnowledgeBaseStack"),
      timeout: cdk.Duration.minutes(5),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBaseForDefaultDoc.knowledgeBaseId,
        DATA_SOURCE_ID: dataSourceForDefaultDoc.dataSourceId,
      },
    });

    lambdaIngestionJobForDefaultDoc.addEventSource(s3PutEventSourceForDefaultDoc);

    lambdaIngestionJobForDefaultDoc.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:StartIngestionJob"],
        resources: [knowledgeBase.knowledgeBaseArn],
      })
    );

    /* EC2 streamlit app에서 참조하기 위한 Bucket의 이름을 parameter store에 저장 */
    new ssm.StringParameter(this, 'CustomFileBucketParam', {
      parameterName: '/RAGChatBot/CUSTOM_FILE_BUCKET_NAME',
      stringValue: bucket.bucketName,
    });

    new ssm.StringParameter(this, 'DefaultFileBucketParam', {
      parameterName: '/RAGChatBot/DEFAULT_FILE_BUCKET_NAME',
      stringValue: bucketForDefaultDoc.bucketName,
    });

    // 생성된 Bucket name, Knowledge Base Id를 출력
    new cdk.CfnOutput(this, "dataSourceBucketName", {
      value: bucket.bucketName,
      description: "S3 bucket name for custom uploading data",
    });

    new cdk.CfnOutput(this, "KnowledgeBaseId", {
      value: knowledgeBase.knowledgeBaseId,
      description: "KnowledgeBase ID for custom upload s3 datasource",
      exportName: "CustomKnowledgeBaseId"
    });

    new cdk.CfnOutput(this, "dataSourceBucketName-ForDefaultDoc", {
      value: bucketForDefaultDoc.bucketName,
      description: "S3 bucket name for default uploaded data"
    });

    new cdk.CfnOutput(this, "KnowledgeBaseId-ForDefaultDoc", {
      value: knowledgeBaseForDefaultDoc.knowledgeBaseId,
      description: "KnowledgeBase ID for default uploaded s3 datasource",
      exportName: "DefaultKnowledgeBaseId"
    });
  }
};
    
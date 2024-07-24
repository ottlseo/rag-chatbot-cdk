import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export class KnowledgeBaseApiStack extends cdk.Stack {
  public readonly CustomFileBucketName: string;
  public readonly DefaultFileBucketName: string;
  public readonly ApiGatewayEndpoint: string;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 버킷 생성
    const randomstr = Math.random().toString(36).substring(2,8);
    const bucket = new s3.Bucket(this, 'KnowledgeBaseFilesBucket', {
        bucketName: `knowledge-base-bucket-demogo-${randomstr}`,
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
        code: lambda.Code.fromAsset("./lib/knowledgeBaseApiStack"),
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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // upload sample data in advance
    new cdk.aws_s3_deployment.BucketDeployment(this, 'DeployDefaultDoc', {
      sources: [cdk.aws_s3_deployment.Source.asset('./lib/knowledgeBaseApiStack/data')],
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
      code: lambda.Code.fromAsset("./lib/knowledgeBaseApiStack"),
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

    // Query lambda 
    const bedrockAccessPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["bedrock:*"],
      resources: ["*"],
    }); 

    const lambdaQuery = new lambda.Function(this, "Query", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "queryLambda.handler",
      code: lambda.Code.fromAsset("./lib/knowledgeBaseApiStack"),
      timeout: cdk.Duration.minutes(5),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBase.knowledgeBaseId,
      },
      initialPolicy: [bedrockAccessPolicy], 
    });

    const lambdaQueryForDefaultDoc = new lambda.Function(this, "QueryDefaultDoc", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "queryLambda.handler",
      code: lambda.Code.fromAsset("./lib/knowledgeBaseApiStack"),
      timeout: cdk.Duration.minutes(5),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBaseForDefaultDoc.knowledgeBaseId,
      },
      initialPolicy: [bedrockAccessPolicy], 
    });

  // API Gateway 생성
  const api = new apigw.RestApi(this, "RAGAPI", {
      restApiName: "RAGAPI",
      description: "RAG API using Bedrock Knowledge Base created by CDK",
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: apigw.Cors.DEFAULT_HEADERS,
      },
      endpointTypes: [apigw.EndpointType.REGIONAL], // endpoint 유형을 Regional로 설정
    });

    // CORS 허용 관련 설정 (통합 응답, 메서드 응답 정의)
    const integrationResponse = {
      proxy: false,
      integrationResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'*'",
          },
          responseTemplates: {
            "application/json": ""
          },
        },
      ],
    };

    const methodResponse = {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true, // Response headers를 Access-Control-Allow-Origin으로 설정
          },
          responseModels: {
            "application/json": apigw.Model.EMPTY_MODEL, // Response body를 application/json으로 빈 값으로 설정
          },
        },
      ],
    };

    // Lambda 함수를 API Gateway에 POST 메서드로 연결
    const queryLambdaIntegration = new apigw.LambdaIntegration(lambdaQuery, integrationResponse);
    const queryDefaultDocLambdaIntegration = new apigw.LambdaIntegration(lambdaQueryForDefaultDoc, integrationResponse);

    api.root.addResource("custom").addMethod("POST", queryLambdaIntegration, methodResponse);
    api.root.addResource("default").addMethod("POST", queryDefaultDocLambdaIntegration, methodResponse);

    this.CustomFileBucketName = bucket.bucketName;
    this.DefaultFileBucketName = bucketForDefaultDoc.bucketName;
    this.ApiGatewayEndpoint = api.url;
 
    new cdk.CfnOutput(this, "dataSourceBucketName", {
      value: bucket.bucketName,
      description: "S3 bucket name for custom uploading data",
      exportName: "CustomFileBucketName"
    });

    new cdk.CfnOutput(this, "KnowledgeBaseId", {
      value: knowledgeBase.knowledgeBaseId,
      description: "KnowledgeBase ID for custom upload s3 datasource",
      exportName: "CustomKnowledgeBaseId"
    });

    new cdk.CfnOutput(this, "dataSourceBucketName-ForDefaultDoc", {
      value: bucketForDefaultDoc.bucketName,
      description: "S3 bucket name for default uploaded data",
      exportName: "DefaultFileBucketName"
    });

    new cdk.CfnOutput(this, "KnowledgeBaseId-ForDefaultDoc", {
      value: knowledgeBaseForDefaultDoc.knowledgeBaseId,
      description: "KnowledgeBase ID for default uploaded s3 datasource",
      exportName: "DefaultKnowledgeBaseId"
    });

    // API Gateway URL 출력
    new cdk.CfnOutput(this, "ApiGatewayUrl", {
      value: `${api.url}`,
      description: "RAG API endpoint URL for Prod stage",
    });
  }
};
    
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export class SyncKnowledgeBaseStack extends cdk.Stack {
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
        code: lambda.Code.fromAsset("./lib/indexingStack"),
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
 
      // Query lambda 
      const bedrockAccessPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:*"],
        resources: ["*"],
      }); 

      const lambdaQuery = new lambda.Function(this, "Query", {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "queryLambda.handler",
        code: lambda.Code.fromAsset("./lib/queryKnowledgeBaseStack"),
        timeout: cdk.Duration.minutes(5),
        environment: {
          KNOWLEDGE_BASE_ID: knowledgeBase.knowledgeBaseId,
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
  
      api.root.addResource("query").addMethod("POST", queryLambdaIntegration, methodResponse);
  
      // API Gateway URL 출력
      new cdk.CfnOutput(this, "ApiGatewayUrl", {
        value: `${api.url}`,
        description: "RAG API endpoint URL for Prod stage",
      }); 
      new cdk.CfnOutput(this, "KnowledgeBaseId", {
        value: knowledgeBase.knowledgeBaseId,
      });
  
      new cdk.CfnOutput(this, "dataSourceBucketName", {
        value: bucket.bucketName,
      });
    }
  };
    // // OpenSearch Serverless 도메인 생성
    // const openSearchDomain = new opensearch.Domain(this, 'OpenSearchDomain', {
    //   domainName: 'bedrock-knowledge-base-domain-demogo',
    // });

    // // IAM 역할 생성 및 관리자 권한 부여
    // const role = new iam.Role(this, 'BedrockAdminRole', {
    //   assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    //   managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
    // });

    // // Lambda 함수 생성
    // const syncFunction = new lambda.Function(this, 'SyncKnowledgeBaseFunction', {
    //   runtime: lambda.Runtime.NODEJS_16_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset('lambda'),
    //   role: role,
    //   environment: {
    //     BUCKET_NAME: bucket.bucketName,
    //     KNOWLEDGE_BASE_ID: 'your-knowledge-base-id-demogo',
    //   },
    // });

    // // Lambda 함수에 S3 읽기 권한 부여
    // bucket.grantRead(syncFunction);

    // Bedrock Knowledge Base 생성
    // const knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
    //     name: "knowledgebase-test-demogo",
    //     description: "",
    //     roleArn: role.roleArn,

    //     knowledgeBaseConfiguration: {
    //         type: "",
    //         vectorKnowledgeBaseConfiguration: {
    //             embeddingModelArn: 'arn:aws:bedrock:us-east-1:979530783699:embeddings/titantextembeddingsv2', // Titan Text Embeddings v2 ARN
    //         },

    //     },
    //     storageConfiguration: {
    //         type: "",
    //         opensearchServerlessConfiguration: {
    //             vectorIndexName: "",
    //             collectionArn: "",
    //             fieldMapping: {
    //                 metadataField: "",
    //                 textField: "",
    //                 vectorField: ""
    //             },
    //         },
    //     }
    // });

    // S3 이벤트와 Lambda 함수 연결
    // bucket.addEventNotification(
    //   s3.EventType.OBJECT_CREATED,
    //   syncFunction,
    //   { suffix: '.txt' } // 선택적으로 특정 파일 확장자에 대해서만 트리거
    // );
//   }
// }
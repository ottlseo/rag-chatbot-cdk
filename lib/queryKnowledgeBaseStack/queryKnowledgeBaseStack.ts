import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

export class QueryKnowledgeBaseStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
      super(scope, id, props);
      
      // Getting value from previous stack (syncKnowledgeBase stack)
      const knowledgeBaseId = cdk.Fn.importValue('CustomKnowledgeBaseId');
      const knowledgeBaseIdForDefaultDoc = cdk.Fn.importValue('DefaultKnowledgeBaseId');

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
          KNOWLEDGE_BASE_ID: knowledgeBaseId,
        },
        initialPolicy: [bedrockAccessPolicy], 
      });

      const lambdaQueryForDefaultDoc = new lambda.Function(this, "QueryDefaultDoc", {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "queryLambda.handler",
        code: lambda.Code.fromAsset("./lib/queryKnowledgeBaseStack"),
        timeout: cdk.Duration.minutes(5),
        environment: {
          KNOWLEDGE_BASE_ID: knowledgeBaseIdForDefaultDoc,
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
  
      // API Gateway URL 출력
      new cdk.CfnOutput(this, "ApiGatewayUrl", {
        value: `${api.url}`,
        description: "RAG API endpoint URL for Prod stage",
      }); 
    }
};
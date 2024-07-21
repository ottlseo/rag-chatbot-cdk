const {
    BedrockAgentRuntimeClient,
    RetrieveAndGenerateCommand,
  } = require("@aws-sdk/client-bedrock-agent-runtime");
  
  const client = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION,
  });
  
  exports.handler = async (event, context) => {
    const question = event['question'];
  
    const input = {
      // RetrieveAndGenerateRequest
      input: {
        // RetrieveAndGenerateInput
        text: question, 
      },
      retrieveAndGenerateConfiguration: {
        // RetrieveAndGenerateConfiguration
        type: "KNOWLEDGE_BASE", 
        knowledgeBaseConfiguration: {
          // KnowledgeBaseRetrieveAndGenerateConfiguration
          knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID, 
          modelArn: `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`, // or "anthropic.claude-3-sonnet-20240229-v1:0"
        },
      },
    };
    const command = new RetrieveAndGenerateCommand(input);
    const response = await client.send(command);
  
    return JSON.stringify({
      response: response.output.text,
    });
  };
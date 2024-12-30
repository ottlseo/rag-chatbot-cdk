const {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
} = require("@aws-sdk/client-bedrock-agent-runtime");

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION,
});

exports.handler = async (event, context) => {
  const question = event['question'];
  const sessionId = event['sessionId'] || null;

  const input = {
    input: {
      text: question, 
    },
    retrieveAndGenerateConfiguration: {
      type: "KNOWLEDGE_BASE", 
      knowledgeBaseConfiguration: {
        knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID, 
        modelArn: `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        retrievalConfiguration: {
	        vectorSearchConfiguration: {
		        overrideSearchType: 'HYBRID',
            numberOfResults: 10,
            rerankingConfiguration: {
              bedrockRerankingConfiguration: {
                metadataConfiguration: {
                  selectionMode: "ALL"
                },
                modelConfiguration: {
                  modelArn: ""
                },
                numberOfRerankedResults: 10
              },
              type: "BEDROCK_RERANKING_MODEL"
            }
	        }
        }
      },
    },
  };
  
  if (sessionId) {
    input.sessionId = sessionId;
  }
  
  const command = new RetrieveAndGenerateCommand(input);
  const response = await client.send(command);

  return JSON.stringify({
    response: response.output.text,
  });
};

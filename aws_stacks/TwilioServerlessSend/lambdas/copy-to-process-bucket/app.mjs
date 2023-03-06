/**
 *  copy-to-process-bucket
 * 
 * Lambda function triggered by the step function and simple moves
 * the next json file from the HOLDING bucket to the PROCESS bucket.
 * 
 */

import { S3Client, CopyObjectCommand } from "@aws-sdk/client-s3";

export const lambdaHandler = async (event, context, callback) => {

    //console.log("event is => ",event);
    /*
        {
            Input: { Payload: { FileArray: [Array], FileArrayLength: n } }
        }    
    */    

    let FileArray = event.Input.Payload.FileArray;

    let client = new S3Client( { region: process.env.REGION } );

    let copyParams = {
        Bucket: process.env.PROCESS_BUCKET,
        CopySource: `${process.env.HOLDING_BUCKET}/${event.Input.Payload.FileArray[0]}`,
        Key: event.Input.Payload.FileArray[0]
    };
    
    let command = new CopyObjectCommand(copyParams);
    
    try {

        // copy the file to the PROCESS bucket
        await client.send(command);        
        
        // Remove the file that was just processed
        FileArray.shift();

        // Return params back to the Step Function
        let result = {
            FileArrayLength: FileArray.length,
            FileArray: FileArray
        };
        
        callback(null, result)
    
    } catch (error) {

        console.log("Error getting JSON from S3! => ", error);

    }

};
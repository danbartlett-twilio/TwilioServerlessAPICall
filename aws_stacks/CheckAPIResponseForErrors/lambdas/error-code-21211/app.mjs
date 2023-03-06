/**
 *  check for error 21211
 *  
 * lambda invoked by event bus if error code matches. 
 */

export const lambdaHandler = async (event, context) => {
    
    // https://www.twilio.com/docs/api/errors/21211
    // Invalid 'To' Phone Number
    console.info("Error Code 21211 => \n" + JSON.stringify(event, null, 2));

};
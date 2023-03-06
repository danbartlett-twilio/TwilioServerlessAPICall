/**
 *  check for error 21212
 *  
 * lambda invoked by event bus if error code matches. 
 */

export const lambdaHandler = async (event, context) => {
    
    // https://www.twilio.com/docs/api/errors/21212
    // Invalid From Number (caller ID)
    console.info("Error Code 21212 => \n" + JSON.stringify(event, null, 2));

};
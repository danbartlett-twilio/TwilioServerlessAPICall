/**
 *  check for error 21215
 *  
 * lambda invoked by event bus if error code matches. 
 */

export const lambdaHandler = async (event, context) => {
    
    // https://www.twilio.com/docs/api/errors/21215
    // Geo Permission configuration is not 
    console.info("Error Code 21215 => \n" + JSON.stringify(event, null, 2));

};
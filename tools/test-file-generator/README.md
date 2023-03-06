# Generate Test File

A simple node script to generate csv or json files that can be loaded into S3 "source" bucket to test the serverless send system. Creates test message objects to call the Twilio test API. Be sure to use your Twilio test credentials!

`node generate-test-file.js csv\json qty`

* csv or json
* qty is the number of records you want to create


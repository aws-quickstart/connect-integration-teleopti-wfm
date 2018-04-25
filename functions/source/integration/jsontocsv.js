exports.jsonconvert = function(jsonobject){
var headers="Agent_ARN,Agent_AfterContactWorkDuration,Agent_AgentInteractionDuration,Agent_Username,Channel,ContactID,InitiationMethod,Queue_ARN,Queue_Duration,Queue_EnqueueTimestamp,Queue_Name,SystemEndpoint_Address,TransferCompletedTimestamp,TransferredToEndpoint";
var csvdata = headers + '\n';
var jsoncorrected = '{"Contacts": [' + jsonobject.replace(/}{|}\n{/g,'},{') + ']}';
parsedObj = JSON.parse(jsoncorrected);
//console.log('Count:' + parsedObj.Contacts.length);
//console.log(parsedObj.Contacts);
for(var i=0;i<parsedObj.Contacts.length;i++){
	//console.log("Agent: " + parsedObj.Contacts[i].Agent);
	if (parsedObj.Contacts[i].Agent === null){
		csvdata += ",,,,"
	}
	else {
		csvdata += parsedObj.Contacts[i].Agent["ARN"].substring(parsedObj.Contacts[i].Agent["ARN"].lastIndexOf("/") + 1, parsedObj.Contacts[i].Agent["ARN"].length) + ",";
		csvdata += parsedObj.Contacts[i].Agent["AfterContactWorkDuration"] + ",";
		csvdata += parsedObj.Contacts[i].Agent["AgentInteractionDuration"] + ",";
		csvdata += parsedObj.Contacts[i].Agent["Username"] + ",";
	}

	csvdata += parsedObj.Contacts[i]["Channel"] + ",";
	csvdata += parsedObj.Contacts[i]["ContactId"] + ",";
	csvdata += parsedObj.Contacts[i]["InitiationMethod"] + ",";
	if (parsedObj.Contacts[i].Queue === null){
		csvdata += ",,,,"
	}
	else {
		csvdata += parsedObj.Contacts[i].Queue["ARN"].substring(parsedObj.Contacts[i].Queue["ARN"].lastIndexOf("/") + 1, parsedObj.Contacts[i].Queue["ARN"].length) + ",";
		csvdata += parsedObj.Contacts[i].Queue["Duration"] + ",";
		csvdata += parsedObj.Contacts[i].Queue["EnqueueTimestamp"] + ",";
		csvdata += parsedObj.Contacts[i].Queue["Name"] + ",";
	}
	csvdata += parsedObj.Contacts[i].SystemEndpoint["Address"] + ",";
	csvdata += parsedObj.Contacts[i]["TransferCompletedTimestamp"] + ",";
	csvdata += parsedObj.Contacts[i]["TransferredToEndpoint"] + '\n';
	//console.log("Record: " + csvdata);
};
return csvdata;
}
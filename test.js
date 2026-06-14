fetch("https://ong-matching-animal-tnsn.vercel.app/api/tutors/me/onboarding-status", {
  "headers": {
    "authorization": "Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6IjAyNzE1NmZkLTk2M2YtNDM2OS04NjU1LTE4NWRiM2MyMGE3NCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2VzeHdzZmVpZ2hqanB6dnlhdmZ6LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI3N2Q2NzNjMC00YzAwLTQ2ZjItOWQ4Zi00YjJkMDQyNjY5OTUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgxNDYyNDkzLCJpYXQiOjE3ODE0NTg4OTMsImVtYWlsIjoiZXJpY2subWFmcmFAaWNsb3VkLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJlcmljay5tYWZyYUBpY2xvdWQuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkVyaWNrIE1hZnJhIiwib25ib2FyZGluZ19hbnN3ZXJzIjp7Imhhc19jaGlsZHJlbiI6ImZhbHNlIiwiaG9tZV90eXBlIjoiYXBhcnRhbWVudG8iLCJub3RlcyI6InRlc3RlIiwicHJlZmVyZW5jZXMiOlsiY29tcGFuaGlhIl0sInByZWZlcnJlZF9lbmVyZ3kiOiJtZWRpbyIsInJvdXRpbmUiOiJtZWlvX3BlcmlvZG8ifSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI3N2Q2NzNjMC00YzAwLTQ2ZjItOWQ4Zi00YjJkMDQyNjY5OTUifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4MTQ1ODg5M31dLCJzZXNzaW9uX2lkIjoiN2RmYjI5YjctNWJhMi00MGY4LWIwOGItMzExZTg3ZDhmNTdiIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.mcqtZIBuFxN99GXMnbyqB4OFWRSEP0zp1HctGdE5GTyyhbazZZgUVgYCe-PkKRlnLEWhsqgXsBTp41xqToLPkQ",
    "sec-ch-ua": "\"Google Chrome\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "Referer": "https://ong-matching-animalfronten-git-975d61-erick-mafra-edus-projects.vercel.app/"
  },
  "body": null,
  "method": "GET"
}).then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));


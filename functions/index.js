'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

/**
 * Triggers when a user gets a new follower and sends a notification.
 *
 * Followers add a flag to `/followers/{followedUid}/{followerUid}`.
 * Users save their device notification tokens to `/users/{followedUid}/notificationTokens/{notificationToken}`.
 */
exports.sendMessageNotification = functions.database.ref('/chats/{chatKey}/messages').onWrite(event => {
	const chatKey = event.params.chatKey;
//	// If un-follow we exit the function.
//	if (!event.data.val()) {
//		return console.log('User ', followerUid, 'un-followed user', followedUid);
//	}
	console.log('New message sent to chat:', chatKey);

	// Get the list of device notification tokens.
	var path = 'chats/' + chatKey + '/messages';
	console.log('Sending query to', path);
	const getMessagesPromise = admin.database().ref(path).limitToLast(1).once('value');
	
	

	// Get the follower profile.
	// const getFollowerProfilePromise = admin.auth().getUser(followerUid);

	return Promise.all([getMessagesPromise]).then(results => {
		const messageSnapshot = results[0];
		const message = messageSnapshot.val();
		var recipientID = "";
		var senderID = "";
		var messageBody = "";
		messageSnapshot.forEach(function(childSnapshot) {
			recipientID = childSnapshot.child("receiverId").val();
			senderID = childSnapshot.child("senderId").val();
			messageBody = childSnapshot.child("body").val();
		});
		
		console.log('Recipient id:', recipientID);
		const getRecipientPromise = admin.database().ref(`/users/${recipientID}`).once('value');
		const getSenderPromise = admin.database().ref(`/users/${senderID}`).once('value');
		
		
		return Promise.all([getRecipientPromise, getSenderPromise]).then(snapshots => {
			const recipientSnapshot = snapshots[0];
			const senderSnapshot = snapshots[1];
			
			const senderName = senderSnapshot.child("first_name").val();
			const token = recipientSnapshot.child("token").val();
			const payload = {
				notification: {
					title: `${senderName} sent you a message.`,
					body: `${messageBody}`,
				}
			};
			console.log("Payload", payload, "sent to token:", token);
			return admin.messaging().sendToDevice(token, payload);
		});
	});
});
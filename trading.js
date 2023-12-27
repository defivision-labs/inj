import { io } from 'socket.io-client';

console.log('started');
const socket = io('http://localhost:3000');

socket.on('connect', () => {
	console.log('connected')
})

socket.on('message', (args) => {
	console.log(args);
});
import { io } from 'socket.io-client';

console.log('started');
const socket = io('http://inj.defivision.io');

socket.on('connect', () => {
	console.log('connected')
})

socket.on('message', (args) => {
	console.log(args);
});
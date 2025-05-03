import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";
import { FiPower } from 'react-icons/fi';

const URL = "https://10.196.41.17:3000";

export const Room = ({
    name,
    localAudioTrack,
    localVideoTrack
}: {
    name: string,
    localAudioTrack: MediaStreamTrack | null,
    localVideoTrack: MediaStreamTrack | null,
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [lobby, setLobby] = useState(true);
    const [socket, setSocket] = useState<null | Socket>(null);
    const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
    const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);
    const [messages, setMessages] = useState<{ message: string, from: "You" | "Other" }[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [roomId, setRoomId] = useState<string | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const handleDisconnect = () => window.location.reload();

    const sendMessage = () => {
        if (inputMessage.trim() && socket && roomId) {
            socket.emit("chat-message", { roomId: roomId, message: inputMessage, sender: name });
            setMessages(prev => [...prev, { message: inputMessage, from: "You" }]);
            setInputMessage("");
        }
    };

    useEffect(() => {
        const socket = io(URL, {
            transports: ["websocket"],
            secure: true
        });

        socket.on("chat-message", ({ sender, message }) => {
            if (sender !== name) {
                setMessages(prev => [...prev, { message, from: "Other" }]);
            }
        });

        socket.on("send-offer", async ({ roomId }) => {
            setLobby(false);
            const pc = new RTCPeerConnection();
            setRoomId(roomId);
            setSendingPc(pc);
            if (localVideoTrack) pc.addTrack(localVideoTrack);
            if (localAudioTrack) pc.addTrack(localAudioTrack);

            pc.onicecandidate = async (e) => {
                if (e.candidate) {
                    socket.emit("add-ice-candidate", { candidate: e.candidate, type: "sender", roomId });
                }
            };

            pc.onnegotiationneeded = async () => {
                const sdp = await pc.createOffer();
                pc.setLocalDescription(sdp);
                socket.emit("offer", { sdp, roomId });
            };
        });

        socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
            setLobby(false);
            const pc = new RTCPeerConnection();
            pc.setRemoteDescription(remoteSdp);
            const sdp = await pc.createAnswer();
            pc.setLocalDescription(sdp);
            const stream = new MediaStream();
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
            setRemoteMediaStream(stream);
            setReceivingPc(pc);

            pc.onicecandidate = async (e) => {
                if (e.candidate) {
                    socket.emit("add-ice-candidate", { candidate: e.candidate, type: "receiver", roomId });
                }
            };

            socket.emit("answer", { roomId, sdp });

            setTimeout(() => {
                const track1 = pc.getTransceivers()[0].receiver.track;
                const track2 = pc.getTransceivers()[1].receiver.track;
                if (track1.kind === "video") {
                    setRemoteAudioTrack(track2);
                    setRemoteVideoTrack(track1);
                } else {
                    setRemoteAudioTrack(track1);
                    setRemoteVideoTrack(track2);
                }
                remoteVideoRef.current?.srcObject?.addTrack(track1);
                remoteVideoRef.current?.srcObject?.addTrack(track2);
                remoteVideoRef.current?.play();
            }, 5000);
        });

        socket.on("answer", ({ sdp }) => {
            setLobby(false);
            setSendingPc(pc => {
                pc?.setRemoteDescription(sdp);
                return pc;
            });
        });

        socket.on("add-ice-candidate", ({ candidate, type }) => {
            if (type === "sender") {
                setReceivingPc(pc => { pc?.addIceCandidate(candidate); return pc; });
            } else {
                setSendingPc(pc => { pc?.addIceCandidate(candidate); return pc; });
            }
        });

        setSocket(socket);
    }, [name]);

    useEffect(() => {
        if (localVideoRef.current && localVideoTrack) {
            localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
            localVideoRef.current.play();
        }
    }, [localVideoRef]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="h-screen w-screen flex flex-col lg:flex-row overflow-hidden bg-gray-950 text-white">
          {/* Left: Video Section */}
          <div className="flex flex-col items-center justify-center p-4 gap-4 w-full lg:w-1/2 h-full">
            <video className="rounded-lg shadow-lg" autoPlay width={400} height={300} ref={localVideoRef} />
            <video className="rounded-lg shadow-lg" autoPlay width={400} height={300} ref={remoteVideoRef} />
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleDisconnect}
                className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
                title="Disconnect"
              >
                <FiPower size={20} />
              </button>
              <a
                target="_blank"
                href="http://10.196.41.17:4367/"
                className="text-white border border-white rounded px-3 py-1 text-sm hover:bg-white hover:text-black transition"
              >
                Play games
              </a>
            </div>
          </div>
      
          {/* Right: Chat Section */}
          <div className="flex flex-col w-full lg:w-1/2 h-full p-6 bg-gray-900">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Chat</h2>
      
            {/* Chat Messages (Scrollable) */}
            <div className="flex-grow overflow-hidden flex flex-col">
              <div className="overflow-y-auto space-y-3 pr-2 mb-2 flex-grow custom-scrollbar">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl max-w-[70%] ${
                      msg.from === "You" ? "bg-blue-600 self-end ml-auto text-right" : "bg-gray-700 self-start"
                    }`}
                  >
                    <span className="block text-xs text-gray-400 mb-1">{msg.from}</span>
                    {msg.message}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
      
              {/* Chat Input */}
              <div className="mt-2 flex">
                <input
                  type="text"
                  className="flex-grow p-3 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 rounded-l-lg focus:outline-none"
                  placeholder="Type a message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 text-white px-6 rounded-r-lg hover:bg-blue-700 transition"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      );
      
};

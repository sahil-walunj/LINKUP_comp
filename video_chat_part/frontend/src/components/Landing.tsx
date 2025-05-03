import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom";
import { Room } from "./Room";

export const Landing = () => {
    const [name, setName] = useState("");
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setlocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [joined, setJoined] = useState(false);

    const getCam = async () => {
        const stream = await window.navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })
        // MediaStream
        const audioTrack = stream.getAudioTracks()[0]
        const videoTrack = stream.getVideoTracks()[0]
        setLocalAudioTrack(audioTrack);
        setlocalVideoTrack(videoTrack);
        if (!videoRef.current) {
            return;
        }
        videoRef.current.srcObject = new MediaStream([videoTrack])
        videoRef.current.play();
        // MediaStream
    }

    useEffect(() => {
        if (videoRef && videoRef.current) {
            getCam()
        }
    }, [videoRef]);

    if (!joined) {

        return <div className="flex flex-col justify-center items-center p-25 ">
            <video autoPlay ref={videoRef}></video>
            <input className="text-white border border-white m-5" placeholder=" Enter your Name" type="text" onChange={(e) => {
                setName(e.target.value);
            }}>
            </input>
            <div className="flex justify-center align-center items-center text-center">
                <button className="text-black border h-min border-white bg-white rounded w-15 " onClick={() => {
                    setJoined(true);
                }}>Join</button>
                <a target="_blank" href="http://10.196.41.17:4367/" className="text-black border border-white bg-white rounded m-5 w-30">Play games</a>
            </div>
        </div>
    }

    return <Room name={name} localAudioTrack={localAudioTrack} localVideoTrack={localVideoTrack} />
}
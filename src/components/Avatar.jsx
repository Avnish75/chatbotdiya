import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useChat } from "../hooks/useChat";
import { SkeletonUtils } from "three-stdlib";

const facialExpressions = {
  default: {},
  smile: {
    browInnerUp: 0.17,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.44,
    noseSneerLeft: 0.1700000727403593,
    noseSneerRight: 0.14000002836874015,
    mouthPressLeft: 0.61,
    mouthPressRight: 0.41000000000000003,
  },
  funnyFace: {
    jawLeft: 0.63,
    mouthPucker: 0.53,
    noseSneerLeft: 1,
    noseSneerRight: 0.39,
    mouthLeft: 1,
    eyeLookUpLeft: 1,
    eyeLookUpRight: 1,
    cheekPuff: 0.9999924982764238,
    mouthDimpleLeft: 0.414743888682652,
    mouthRollLower: 0.32,
    mouthSmileLeft: 0.35499733688813034,
    mouthSmileRight: 0.35499733688813034,
  },
  sad: {
    mouthFrownLeft: 1,
    mouthFrownRight: 1,
    mouthShrugLower: 0.78341,
    browInnerUp: 0.452,
    eyeSquintLeft: 0.72,
    eyeSquintRight: 0.75,
    eyeLookDownLeft: 0.5,
    eyeLookDownRight: 0.5,
    jawForward: 1,
  },
  surprised: {
    eyeWideLeft: 0.5,
    eyeWideRight: 0.5,
    jawOpen: 0.351,
    mouthFunnel: 1,
    browInnerUp: 1,
  },
  angry: {
    browDownLeft: 1,
    browDownRight: 1,
    eyeSquintLeft: 1,
    eyeSquintRight: 1,
    jawForward: 1,
    jawLeft: 1,
    mouthShrugLower: 1,
    noseSneerLeft: 1,
    noseSneerRight: 0.42,
    eyeLookDownLeft: 0.16,
    eyeLookDownRight: 0.16,
    cheekSquintLeft: 1,
    cheekSquintRight: 1,
    mouthClose: 0.23,
    mouthFunnel: 0.63,
    mouthDimpleRight: 1,
  },
  crazy: {
    browInnerUp: 0.9,
    jawForward: 1,
    noseSneerLeft: 0.5700000000000001,
    noseSneerRight: 0.51,
    eyeLookDownLeft: 0.39435766259644545,
    eyeLookUpRight: 0.4039761421719682,
    eyeLookInLeft: 0.9618479575523053,
    eyeLookInRight: 0.9618479575523053,
    jawOpen: 0.9618479575523053,
    mouthDimpleLeft: 0.9618479575523053,
    mouthDimpleRight: 0.9618479575523053,
    mouthStretchLeft: 0.27893590769016857,
    mouthStretchRight: 0.2885543872656917,
    mouthSmileLeft: 0.5578718153803371,
    mouthSmileRight: 0.38473918302092225,
    tongueOut: 0.9618479575523053,
  },
};

const corresponding = {
  A: { open: 1.0, smile: 0.38 },
  B: { open: 0.0, smile: 0.36 },
  C: { open: 1, smile: 0.66 },
  D: { open: 1, smile: 0 },
  E: { open: 0.49, smile: 0.14 },
  F: { open: 0, smile: 0.7 },
  G: { open: 1, smile: 0 },
  H: { open: 0, smile: 0.31 },
  I: { open: 0.41, smile: 1 },
  J: { open: 0.3, smile: 0.6 },
  K: { open: 0.72, smile: 0.41 },
  L: { open: 0.72, smile: 0.41 },
  M: { open: 0.0, smile: 0.41 },
  N: { open: 0, smile: 0.6 },
  O: { open: 1, smile: 0 },
  P: { open: 0.0, smile: 0.19 },
  Q: { open: 0.72, smile: 0.41 },
  R: { open: 0.38, smile: 0.19 },
  S: { open: 0.11, smile: 0.49 },
  T: { open: 0.33, smile: 0.18 },
  U: { open: 0.37, smile: 0 },
  V: { open: 0.45, smile: 0 },
  W: { open: 0.6, smile: 0.4 },
  X: { open: 0.3, smile: 0.3 },
  Y: { open: 0.4, smile: 0.6 },
  Z: { open: 0.2, smile: 0.5 },
};

let setupMode = false;

export function Avatar(props) {
  const group = useRef();
  const { message, onMessagePlayed, chat } = useChat();
  const [lipsync, setLipsync] = useState();
  const [audio, setAudio] = useState();

  const { scene: rawScene } = useGLTF("/models/doctorz.glb");
  const cloned = useMemo(() => SkeletonUtils.clone(rawScene), [rawScene]);
  const [clonedNodes, setClonedNodes] = useState({});

  useEffect(() => {
    cloned.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        console.log(`Mesh: ${child.name}`);
        Object.keys(child.morphTargetDictionary).forEach((targetName) => {
          console.log(`Morph Target: ${targetName}`);
        });
      }
    });
  }, [cloned]);

  const animationsGLTF = useGLTF("/models/animations.glb");

  const filteredAnimations = useMemo(() => {
    const validNodes = new Set();
    cloned.traverse((child) => {
      if (child.name) validNodes.add(child.name);
    });

    return animationsGLTF.animations.map((clip) => {
      const filteredTracks = clip.tracks.filter((track) => {
        const [nodeName] = track.name.split(".");
        return validNodes.has(nodeName);
      });
      return new THREE.AnimationClip(clip.name, clip.duration, filteredTracks);
    });
  }, [animationsGLTF.animations, cloned]);

  const { actions, mixer } = useAnimations(filteredAnimations, cloned);
  const [animation, setAnimation] = useState(
    filteredAnimations.find((a) => a.name === "Idle")?.name || filteredAnimations[0]?.name
  );

  const [blink, setBlink] = useState(false);
  const [winkLeft, setWinkLeft] = useState(false);
  const [winkRight, setWinkRight] = useState(false);
  const [facialExpression, setFacialExpression] = useState("");

  useEffect(() => {
    const temp = {};
    cloned.traverse((child) => {
      if (child.name) temp[child.name] = child;
    });
    setClonedNodes(temp);
  }, [cloned]);

  useEffect(() => {
    if (!message) {
      setAnimation("Idle");
      if (audio) {
        audio.pause();
        setAudio(null);
      }
      setLipsync(null);
      setFacialExpression("");
      return;
    }

    setAnimation(message.animation || "Talking_1");
    setFacialExpression(message.facialExpression || "smile");
    setLipsync(message.lipsync);

    if (audio) {
      audio.pause();
      setAudio(null);
    }

    const audioObj = new Audio("data:audio/mp3;base64," + message.audio);
    audioObj.play();
    setAudio(audioObj);

    audioObj.onended = () => {
      setAnimation("Idle");
      if (onMessagePlayed) onMessagePlayed();
      setLipsync(null);
      setAudio(null);
    };
  }, [message]);

  useEffect(() => {
    if (!actions) return;
    const action = actions[animation];
    if (!action) return;

    Object.values(actions).forEach((a) => {
      if (a !== action) a.fadeOut(0.5);
    });

    action.reset().fadeIn(0.5).play();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.timeScale = 0.5;

    if (animation !== "Idle") {
      const onFinished = () => setAnimation("Idle");
      mixer.addEventListener("finished", onFinished);
      return () => {
        mixer.removeEventListener("finished", onFinished);
        action.fadeOut(0.5);
      };
    }

    return () => action.fadeOut(0.5);
  }, [animation, actions]);

  const lerpMorphTarget = (target, value, speed = 0.1) => {
    cloned.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (index === undefined) return;
        const current = child.morphTargetInfluences[index] || 0;
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(current, value, speed);
      }
    });
  };

  useFrame((state, delta) => {
    mixer?.update(delta);

    if (!setupMode) {
      const dict = clonedNodes?.Wolf3D_Head001?.morphTargetDictionary || {};

      Object.keys(dict).forEach((key) => {
        const mapping = facialExpressions[facialExpression];
        if (key !== "eyeBlinkLeft" && key !== "eyeBlinkRight") {
          lerpMorphTarget(key, mapping?.[key] ?? 0, 0.1);
        }
      });

      lerpMorphTarget("eyeBlinkLeft", blink || winkLeft ? 1 : 0, 0.5);
      lerpMorphTarget("eyeBlinkRight", blink || winkRight ? 1 : 0, 0.5);

      if (message && lipsync?.mouthCues && Array.isArray(lipsync.mouthCues) && audio) {
        const t = audio.currentTime;
        let open = 0;
        let smile = 0;
        let visemes = {};

        for (let cue of lipsync.mouthCues) {
          if (t >= cue.start && t <= cue.end) {
            const match = corresponding[cue.value] || { open: 0, smile: 0 };
            open = match.open;
            smile = match.smile;
            Object.entries(match).forEach(([key, val]) => {
              if (key !== "open" && key !== "smile") {
                visemes[key] = val;
              }
            });
            break;
          }
        }

        lerpMorphTarget("mouthOpen", open, 0.2);
        lerpMorphTarget("mouthSmile", smile, 0.2);
        Object.entries(visemes).forEach(([key, val]) => {
          lerpMorphTarget(key, val, 0.2);
        });
      }
    }
  });

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload("/models/doctorz.glb");
useGLTF.preload("/models/animations.glb");
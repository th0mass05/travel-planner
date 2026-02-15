"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth } from "../../firebase";
import { setDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { getDoc } from "firebase/firestore";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();


  const handleSubmit = async () => {
    try {
      setError("");

      let cred;

      if (isSignup) {
        cred = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        cred = await signInWithEmailAndPassword(auth, email, password);
      }

      // ⭐ ENSURE USER EXISTS IN FIRESTORE
      const userRef = doc(db, "users", cred.user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          email: cred.user.email
        });
      }

      router.push("/");

    } catch (e: any) {
      setError(e.message);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8]">
      <div className="bg-white p-8 rounded-lg border-2 w-96 space-y-4">
        <h2 className="text-2xl font-serif text-center">
          {isSignup ? "Create Account" : "Login"}
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full border-2 rounded-lg px-3 py-2"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border-2 rounded-lg px-3 py-2"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          className="w-full bg-gray-900 text-white py-2 rounded-lg"
        >
          {isSignup ? "Sign up" : "Login"}
        </button>

        <button
          onClick={()=>setIsSignup(!isSignup)}
          className="w-full text-sm text-gray-600"
        >
          {isSignup ? "Already have an account? Login" : "Create account"}
        </button>
      </div>
    </div>
  );
}

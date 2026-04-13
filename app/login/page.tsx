"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, db } from "../../firebase"; // Adjust path
import { setDoc, doc, getDoc } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); 
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [resetMsg, setResetMsg] = useState("");

  const handleForgotPassword = async () => {
      if (!email) {
        setError("Please enter your email address first.");
        return;
      }
      try {
        setError("");
        await sendPasswordResetEmail(auth, email);
        setResetMsg("Password reset email sent! Check your inbox.");
      } catch (e: any) {
        setError(e.message);
      }
    };

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // 👇 ADDED: Prevents the page from refreshing on Enter
    try {
      setError("");

      let cred;
      const cleanUsername = username.trim().toLowerCase();

      if (isSignup) {
        // 1. Validate Username format
        if (!cleanUsername || cleanUsername.length < 3) {
          throw new Error("Username must be at least 3 characters.");
        }
        if (/[^a-z0-9_]/.test(cleanUsername)) {
          throw new Error("Username can only contain letters, numbers, and underscores.");
        }

        // 2. Check if username is taken BEFORE creating auth account
        const usernameRef = doc(db, "usernames", cleanUsername);
        const usernameSnap = await getDoc(usernameRef);
        if (usernameSnap.exists()) {
          throw new Error("Username is already taken. Please choose another.");
        }

        // 3. Create Auth Account
        cred = await createUserWithEmailAndPassword(auth, email, password);

        // 4. Save to Firestore `users` collection
        const userRef = doc(db, "users", cred.user.uid);
        await setDoc(userRef, {
          email: cred.user.email,
          username: cleanUsername,
          name: cleanUsername // Default their display name to their username initially
        });

        // 5. Reserve the username in the `usernames` collection
        await setDoc(usernameRef, {
          uid: cred.user.uid
        });

      } else {
        // Standard Login
        cred = await signInWithEmailAndPassword(auth, email, password);
        
        // Ensure user exists in Firestore
        const userRef = doc(db, "users", cred.user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, { email: cred.user.email });
        }
      }

      router.push("/");

    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8] font-sans">
      <div className="bg-white p-8 rounded-2xl border border-stone-200 w-96 shadow-sm">
        <h2 className="text-3xl font-serif text-center text-stone-900 mb-6">
          {isSignup ? "Create Account" : "Welcome Back"}
        </h2>

        {/* 👇 ADDED: <form> wrapper handles the "Enter" key automatically */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignup && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Username</label>
              <input
                type="text"
                placeholder="e.g. travelbug99"
                className="w-full border border-stone-300 rounded-lg px-4 py-2.5 outline-none focus:border-stone-900"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Email</label>
            <input
              type="email"
              placeholder="you@email.com"
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 outline-none focus:border-stone-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 outline-none focus:border-stone-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-rose-500 text-sm font-medium">{error}</p>}

          <button
            type="submit" 
            className="cursor-pointer w-full bg-stone-900 text-white py-3 rounded-lg font-bold hover:bg-stone-800 transition-colors shadow-md mt-2"
          >
            {isSignup ? "Sign up" : "Login"}
          </button>
        </form>

        <div className="space-y-3 mt-4">
          {!isSignup && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="cursor-pointer w-full text-xs font-bold text-stone-400 hover:text-stone-900 transition-colors"
            >
              Forgot your password?
            </button>
          )}

          {resetMsg && (
            <p className="text-emerald-600 text-sm font-medium text-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              {resetMsg}
            </p>
          )}

          <button
            type="button"
            onClick={() => { setIsSignup(!isSignup); setError(""); }}
            className="cursor-pointer w-full text-sm font-bold text-stone-500 hover:text-stone-900 transition-colors"
          >
            {isSignup ? "Already have an account? Login" : "Need an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
import { create } from 'zustand';
export const useIdentityStore=create<{userId:string;select:(id:string)=>void}>(set=>({userId:localStorage.getItem('pragya-local-identity')??'',select:userId=>{localStorage.setItem('pragya-local-identity',userId);set({userId});}}));

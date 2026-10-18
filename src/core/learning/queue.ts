/** Serialize writes per trainee so delayed UI/storage work cannot overwrite newer learning data. */
const queues=new Map<string,Promise<unknown>>();
export function serializeLearning<T>(id:string,work:()=>Promise<T>):Promise<T>{
  const previous=queues.get(id)??Promise.resolve();const result=previous.catch(()=>undefined).then(work);queues.set(id,result);
  void result.finally(()=>{if(queues.get(id)===result)queues.delete(id);}).catch(()=>undefined);return result;
}

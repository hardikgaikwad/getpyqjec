const fetchUrls = async (queries) => {
  const res = await fetch("http://localhost:3003/data?" + queries);  //http://localhost:3003/data this will hit on my backend. Question mark represents that after ? there are queries.
  if (!res.ok) throw new Error("Fail to fetch data");
  const resData = await res.json();
  return resData.url;
}

const uploadData = async(data)=>{
  try{const res = await fetch("http://localhost:3003/upload", {
  method: "POST",
  body: data,
  });
  if (!res.ok) throw new Error("Failed to upload data");
  const resData = await res.json();
  return resData;}
  catch(err){
    throw new Error(err.message);
  }
}


export {fetchUrls,uploadData}
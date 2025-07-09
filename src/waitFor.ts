const waitFor = async (interval: number) : Promise<null> => {
  return new Promise(resolve => {
    setTimeout(
      () => {
        resolve(null)      
      },
      interval
    )
  })
}

export default waitFor

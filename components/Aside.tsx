import React from 'react'
import WhoToFollow from './Features/follow/WhoToFollow'

const Aside = () => {
  return (
      <div className='flex flex-col space-y-6 w-full max-w-xs p-4'>
            {/* <Ads /> */}
          <WhoToFollow compact />
          {/* <FriendsOnline /> */}
          {/* <Trending />   */}
    </div>
  )
}

export default Aside
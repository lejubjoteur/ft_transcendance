import React from 'react'

const EmptyStateContactList = () => {
	return (
		<>
			<div className="flex h-full justify-center items-center scrollbar-hide overflow-hidden">
				<p className="font-pilowlava text-slate-700 text-center text-[56px]">
					No friends yet :(
				</p>
			</div>
		</>
	)
}

export default EmptyStateContactList
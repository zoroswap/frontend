export const SwapPairs = (
  { swapPairs, disabled }: { swapPairs: () => void; disabled: boolean },
) => {
  return (
    <button
      onClick={swapPairs}
      disabled={disabled}
      className='p-0 border-0 bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group'
    >
      <svg
        width='32'
        height='32'
        viewBox='0 0 57 57'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className='transition-all'
      >
        <rect
          y='0.000152588'
          width='56.3444'
          height='56.3444'
          className='group-hover:fill-primary/10 transition-all fill-card'
        />
        <rect
          x='0.352153'
          y='0.352305'
          width='55.6401'
          height='55.6401'
          stroke='black'
          strokeOpacity='0.2'
          strokeWidth='0.704305'
          className='transition-all dark:stroke-white'
        />

        <g className='transition-all duration-300 ease hover:rotate-[180deg] active:rotate-[180deg] origin-center'>
          <rect
            x='0'
            y='0'
            width='100%'
            height='100%'
            stroke='0'
            fill='transparent'
            className='transition-all'
          />
          <path
            d='M42.2621 23.9345L39.639 26.5554L39.639 22.4535C39.639 20.9267 38.9111 19.535 37.8719 18.4981C36.8349 17.4589 35.4432 16.731 33.9165 16.731C32.3691 16.7081 32.3691 19.0429 33.9165 19.02C34.6787 19.02 35.576 19.4366 36.2535 20.1164C36.9334 20.794 37.35 21.6912 37.35 22.4535L37.35 26.5576L34.7268 23.9322C33.6464 22.8106 31.9846 24.4724 33.1062 25.5528L37.5857 30.03C37.6923 30.1694 37.8294 30.2825 37.9866 30.3604C38.1438 30.4384 38.3168 30.4791 38.4922 30.4796C38.6676 30.48 38.8408 30.4401 38.9984 30.363C39.156 30.2858 39.2937 30.1735 39.4009 30.0346L39.4124 30.0209L43.8828 25.5482C44.954 24.5113 43.3425 22.8151 42.2621 23.9299M22.4669 37.348C21.7047 37.348 20.8074 36.9314 20.1299 36.2515C19.4501 35.574 19.0335 34.6767 19.0335 33.9145L19.0335 29.8126L21.6589 32.4358C22.7393 33.5436 24.3371 31.8544 23.2772 30.8175L18.7977 26.3379C18.6903 26.1976 18.5518 26.0841 18.3931 26.0062C18.2345 25.9284 18.06 25.8883 17.8833 25.8892C17.7065 25.8901 17.5324 25.9319 17.3746 26.0113C17.2167 26.0908 17.0794 26.2057 16.9734 26.3471L12.5007 30.8175C11.3791 31.8979 13.0409 33.5597 14.1213 32.4358L16.7445 29.8126L16.7445 33.9168C16.7445 35.4435 17.4724 36.8352 18.5116 37.8721C19.5485 38.9113 20.9402 39.6392 22.4669 39.6392C23.9891 39.6392 23.9891 37.3502 22.4669 37.3502'
            className='fill-[#FF5500] light:group-hover:fill-black transition-all'
          />
        </g>
      </svg>
    </button>
  );
};

export default SwapPairs;

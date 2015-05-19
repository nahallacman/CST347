#include "leddrv.h"
//#include <xc.h>
#include <plib.h>
//#include <peripheral/int.h>
//#include <stdint.h>

uint8_t initalizeLedDriver(void)
{
    mPORTDClearBits(0xFF);
    mPORTDSetPinsDigitalOut(BIT_0 | BIT_1 | BIT_2);
    return 0;
}

uint8_t readLed(uint8_t ledNum)
{
    return mPORTDReadBits(1 << ledNum);
}

uint8_t setLED(uint8_t ledNum, uint8_t value)
{
    if(value == 1)
    {
        mPORTDSetBits(1 << ledNum);
    }
    else if(value == 0)
    {
         mPORTDClearBits( 1 << ledNum);
    }
}

uint8_t toggleLED(uint8_t ledNum){
    mPORTDToggleBits(1 << ledNum);
    return 0;
}
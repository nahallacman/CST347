#include "leddrv.h"
//#include <xc.h>
#include <plib.h>
//#include <peripheral/int.h>
//#include <stdint.h>

uint8_t initalizeLedDriver(void)
{
    mPORTAClearBits(0xFF);
    return 0;
}

uint8_t readLed(uint8_t ledNum)
{
    return mPORTAReadBits(ledNum);
}

uint8_t setLED(uint8_t ledNum, uint8_t value)
{
    if(value == 1)
    {
        mPORTASetBits(ledNum);
    }
    else if(value == 0)
    {
         mPORTAClearBits(ledNum);
    }
}

uint8_t toggleLED(uint8_t ledNum){
    mPORTAToggleBits(1 << ledNum);
    return 0;
}
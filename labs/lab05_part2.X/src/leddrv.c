#include "leddrv.h"
//#include <xc.h>
#include <plib.h>
//#include <peripheral/int.h>
//#include <stdint.h>



#ifdef CALS_BOARD

uint8_t initalizeLedDriver(void)
{
    int i;
    mPORTDClearBits(0xFF);
    mPORTDSetPinsDigitalOut(BIT_0 | BIT_1 | BIT_2);

    //initalize the button press mutex
    for(i = 0; i <= 2; i++)
    {
        LEDmutex[i] = xSemaphoreCreateBinary();
    }
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

#else

uint8_t initalizeLedDriver(void)
{
    int i;
    mPORTAClearBits(0xFF);
    mPORTASetPinsDigitalOut(BIT_0 | BIT_1 | BIT_2);

    //initalize the button press mutex
    for(i = 0; i <= 2; i++)
    {
        LEDmutex[i] = xSemaphoreCreateBinary();
    }
    return 0;
}

uint8_t readLed(uint8_t ledNum)
{
    return mPORTAReadBits(1 << ledNum);
}

uint8_t setLED(uint8_t ledNum, uint8_t value)
{
    if(value == 1)
    {
        mPORTASetBits(1 << ledNum);
    }
    else if(value == 0)
    {
         mPORTAClearBits( 1 << ledNum);
    }
}

uint8_t toggleLED(uint8_t ledNum){
    mPORTAToggleBits(1 << ledNum);
    return 0;
}

#endif
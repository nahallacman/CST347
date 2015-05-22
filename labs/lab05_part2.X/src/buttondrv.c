#include "buttondrv.h"
#include <plib.h>


void __attribute__((interrupt(ipl0), vector(_CHANGE_NOTICE_VECTOR))) vCN_ISR_Wrapper(void);

void initCN(void)
{
    // The following sequence initializes the RD6 (SW1), RD7 (SW2) and RD13 (SW3) pins to be used
    // with the change notification module. This will allow an interrupt to notify when one of
    // these pins change from HIGH-to-LOW (pressed) or LOW-to-HIGH (released). Pullups need to
    // be enabled. The mCNOpen() eliminates the need for any ConfigCNPullups() calls.

    // CNCON<15>
    // Set CNPUE<x> for each pin used - Done by main config
    // set CNEN<x> for each pin used
    mCNOpen(CN_ON, CN15_ENABLE | CN16_ENABLE | CN19_ENABLE, CN15_PULLUP_ENABLE | CN16_PULLUP_ENABLE | CN19_PULLUP_ENABLE);

    // Read PORTx to clear andy *mismatch* for each PORT having a used pin
    //also initalize the variable (may not be the appropriate place for this)
    LastButtonState = mPORTDRead();

    // Set IPC6<20-18> and <17-16> for interrupt priority and subpriority
    // Clear IFS1<0> to clear interrupt status
    // Set IEC1<0> to unmask/enable interrupt
    ConfigIntCN(CHANGE_INT_PRI_3 | CHANGE_INT_ON);

    //initalize the button press mutex
    //buttonpressmutex = xSemaphoreCreateBinary();
    buttonpressmutex = xSemaphoreCreateMutex();

            xSemaphoreTake(
                   buttonpressmutex,
                   portMAX_DELAY
               );
}


void vCN_ISR(void)
{
    int i;

    /* Variables */
    static portBASE_TYPE xHigherPriorityTaskWoken;

    // ISR code
    ConfigIntCN(CHANGE_INT_OFF);
    mCNClearIntFlag();

    // YOU WILL NEED TO WRITE THIS SIMPLE FUNCTIONALITY.
    // give buttonTask mutex
    // Returns xHigherPriorityTaskWoken
    
    //this returns true if the give was successful
    if( xSemaphoreGiveFromISR( buttonpressmutex, &xHigherPriorityTaskWoken ) == pdTRUE )
    {
        //success
        i = 0;
    }
    else
    {
        //fail
        i = 1;
    }


    /* If sending or receiving necessitates a context switch, then switch now. */
    portEND_SWITCHING_ISR( xHigherPriorityTaskWoken );
}

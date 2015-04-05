
/*
 * File:   leddrv.h
 * Author: mainuser
 *
 * Created on April 2, 2015, 7:48 PM
 */

#ifndef MYTASKS_H
#define	MYTASKS_H

#ifdef	__cplusplus
extern "C" {
#endif

#include "leddrv.h"

//void taskmyLeds(uint8_t time, uint8_t tasktype);
//static void taskmyLeds(void *pvParameters);

//cals tasks
//static void taskmyLeds(void *pvParameters);

//I tried to put this in a separate file but too many includes are required
static void taskmyLeds(void *pvParameters)
{
  //  xTaskParameter_t *pxTaskParameter;
  //  portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
 //   pxTaskParameter = (xTaskParameter_t *) pvParameters;

    while (1)
    {
        /* Note the time before entering the while loop.  xTaskGetTickCount()
        is a FreeRTOS API function. */
   //     xStartTime = xTaskGetTickCount();

        /* Loop until pxTaskParameters->xToggleRate ticks have */
    //    while ((xTaskGetTickCount() - xStartTime) < pxTaskParameter->xToggleRate);



        /* This task toggles the LED specified in its task parameter. */
        /* This task toggles the LED specified in its task parameter. */

        toggleLED(1);
    }
}

#ifdef	__cplusplus
}
#endif

#endif	/* MYTASKS_H */

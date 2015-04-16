/*
    FreeRTOS V7.1.1 - Copyright (C) 2012 Real Time Engineers Ltd.


 ***************************************************************************
 *                                                                       *
 *    FreeRTOS tutorial books are available in pdf and paperback.        *
 *    Complete, revised, and edited pdf reference manuals are also       *
 *    available.                                                         *
 *                                                                       *
 *    Purchasing FreeRTOS documentation will not only help you, by       *
 *    ensuring you get running as quickly as possible and with an        *
 *    in-depth knowledge of how to use FreeRTOS, it will also help       *
 *    the FreeRTOS project to continue with its mission of providing     *
 *    professional grade, cross platform, de facto standard solutions    *
 *    for microcontrollers - completely free of charge!                  *
 *                                                                       *
 *    >>> See http://www.FreeRTOS.org/Documentation for details. <<<     *
 *                                                                       *
 *    Thank you for using FreeRTOS, and thank you for your support!      *
 *                                                                       *
 ***************************************************************************


    This file is part of the FreeRTOS distribution.

    FreeRTOS is free software; you can redistribute it and/or modify it under
    the terms of the GNU General Public License (version 2) as published by the
    Free Software Foundation AND MODIFIED BY the FreeRTOS exception.
    >>>NOTE<<< The modification to the GPL is included to allow you to
    distribute a combined work that includes FreeRTOS without being obliged to
    provide the source code for proprietary components outside of the FreeRTOS
    kernel.  FreeRTOS is distributed in the hope that it will be useful, but
    WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
    more details. You should have received a copy of the GNU General Public
    License and the FreeRTOS license exception along with FreeRTOS; if not it
    can be viewed here: http://www.freertos.org/a00114.html and also obtained
    by writing to Richard Barry, contact details for whom are available on the
    FreeRTOS WEB site.

    1 tab == 4 spaces!
    
 ***************************************************************************
 *                                                                       *
 *    Having a problem?  Start by reading the FAQ "My application does   *
 *    not run, what could be wrong?                                      *
 *                                                                       *
 *    http://www.FreeRTOS.org/FAQHelp.html                               *
 *                                                                       *
 ***************************************************************************

    
    http://www.FreeRTOS.org - Documentation, training, latest information, 
    license and contact details.
    
    http://www.FreeRTOS.org/plus - A selection of FreeRTOS ecosystem products,
    including FreeRTOS+Trace - an indispensable productivity tool.

    Real Time Engineers ltd license FreeRTOS to High Integrity Systems, who sell 
    the code with commercial support, indemnification, and middleware, under 
    the OpenRTOS brand: http://www.OpenRTOS.com.  High Integrity Systems also
    provide a safety engineered and independently SIL3 certified version under 
    the SafeRTOS brand: http://www.SafeRTOS.com.
 */

#include "myTasks.h"
#include "leddrv.h"
#include "myTasks.c"

/* Hardware include. */
#include <xc.h>

/* Standard includes. */
#include <stdint.h>
#include <plib.h>

/* FreeRTOS includes. */
//#include <FreeRTOS.h>
//#include "task.h"
//#include "queue.h"

/* cals includes */
enum state_enum{
    IDLE = 0,
    DB1,
    PRESSED,
    HOLD,
    DB2
};

/* Hardware configuration. */
#pragma config FPLLMUL = MUL_20, FPLLIDIV = DIV_2, FPLLODIV = DIV_1, FWDTEN = OFF
#pragma config POSCMOD = HS, FNOSC = PRIPLL, FPBDIV = DIV_2, CP = OFF, BWP = OFF
#pragma config PWP = OFF /*, UPLLEN = OFF, FSRSSEL = PRIORITY_7 */

/* Time is measured in "ticks".  The tick rate is set by the configTICK_RATE_HZ
configuration parameter (defined in FreeRTOSConfig.h).  If configTICK_RATE_HZ
is equal to or less than 1000 (1KHz) then portTICK_RATE_MS can be used to 
convert a time in milliseconds into a time in ticks. */
#define mainTOGGLE_PERIOD ( 200UL / portTICK_RATE_MS )

#define Explorer_16 1 // CIK ADDED

/*-----------------------------------------------------------*/
/* Functions used by this demo.                              */
/*-----------------------------------------------------------*/
/* A task that toggles an LED at a fixed frequency.  This time, the LED to
toggle and the rate at which the LED is toggled are passed into the task
using the task parameter.  This allows the same task function to be used to
create multiple tasks that each behave slightly differently. */
static void taskToggleAnLED(void *pvParameters);

//cals tasks
//extern static void taskmyLeds(void *pvParameters);
static void taskSystemControl(void *pvParameters);

/* Performs the hardware initialisation to ready the hardware to run this example */
static void prvSetupHardware(void);

/*-----------------------------------------------------------*/
/* Structures used by this demo.                             */
/*-----------------------------------------------------------*/
/* The structure that is passed into tasks that use the prvToggleAnLED() task function.
 The structure lets the task know which LED to toggle, and at which rate. */
//typedef struct xTASK_PARAMETER {
//    uint16_t usLEDNumber;                   /* The number of the LED to toggle. */
//    portTickType xToggleRate;               /* The rate at which the LED should be toggle. */
//} xTaskParameter_t;

/*-----------------------------------------------------------*/
/* Variables used by this demo.                              */
/*-----------------------------------------------------------*/
/* Create an xTaskParameters_t structure for each of the two tasks that are 
created using the prvToggleAnLED() task function. */
static const xTaskParameter_t xTask0Parameters = {0 /* Toggle LED1 */, (800 / portTICK_RATE_MS) /* At 800ms. */};
static const xTaskParameter_t xTask1Parameters = {1 /* Toggle LED2 */, (400 / portTICK_RATE_MS) /* At 400ms. */};
static const xTaskParameter_t xTask2Parameters = {2 /* Toggle LED3 */, (150 / portTICK_RATE_MS) /* At 150ms. */};

/*-----------------------------------------------------------*/
int main(void)
{
    /* Perform any hardware initialisation that may be necessary. */
    prvSetupHardware();

    TaskHandle_t xHandle[3];

    xHandle[0] = NULL;
    xHandle[1] = NULL;
    xHandle[2] = NULL;

    //here is where the tasks are initiated and set up

       xTaskCreate(taskSystemControl,
            "LED1",
            configMINIMAL_STACK_SIZE,
            (void *) &xTask0Parameters,
            1,
            NULL);
/*
    xTaskCreate(taskToggleAnLED,
            "LED1",
            configMINIMAL_STACK_SIZE,
            (void *) &xTask0Parameters,
            1,
            &xHandle[0]);
 configASSERT( xHandle[0] );
 */
    /*
     xTaskCreate(taskmyLeds,
            "LED1",
            configMINIMAL_STACK_SIZE,
            (void *) &xTask0Parameters,
            1,
            NULL);
*/
   /*
    xTaskCreate(taskToggleAnLED,
            "LED2",
            configMINIMAL_STACK_SIZE,
            (void *) &xTask1Parameters,
            1,
            &xHandle[1]);
 configASSERT( xHandle[1] );

    xTaskCreate(taskToggleAnLED,
            "LED3",
            configMINIMAL_STACK_SIZE,
            (void *) &xTask2Parameters,
            1,
            &xHandle[2]);
 configASSERT( xHandle[2] );
*/
  //if( xHandle[0] != NULL )
  //{
  //    vTaskDelete( xHandle[0] );
  //}

    //vTaskSuspend(xHandle[2]);
    /* Start the scheduler so the tasks start executing.  This function should not return. */
    vTaskStartScheduler();



}

/*-----------------------------------------------------------*/

//cals stuff
//controls the LED directly. follow this to find the SFR write code
//"driver" function
static void taskToggleAnLED(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    //portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    while (1)
    {
        /* Note the time before entering the while loop.  xTaskGetTickCount()
        is a FreeRTOS API function. */
        //xStartTime = xTaskGetTickCount();

        /* Loop until pxTaskParameters->xToggleRate ticks have */
        //while ((xTaskGetTickCount() - xStartTime) < pxTaskParameter->xToggleRate);

        //try to delay the task for 500 ms
        vTaskDelay(500);
        
        toggleLED(pxTaskParameter->usLEDNumber);

    }
}

/*-----------------------------------------------------------*/
static void prvSetupHardware(void)
{
    /* Setup the CPU clocks, and configure the interrupt controller. */
    SYSTEMConfigPerformance(configCPU_CLOCK_HZ);
    mOSCSetPBDIV(OSC_PB_DIV_2);
    INTEnableSystemMultiVectoredInt();
    
    initalizeLedDriver();

    //switch pullups
    ConfigCNPullups(CN15_PULLUP_ENABLE | CN16_PULLUP_ENABLE | CN19_PULLUP_ENABLE);
}

static void taskSystemControl(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    TaskHandle_t xHandle[3];

    xHandle[0] = NULL;
    xHandle[1] = NULL;
    xHandle[2] = NULL;

    xTaskParameter_t xTask3Parameters[3];// = {0 /* Toggle LED1 */, (800 / portTICK_RATE_MS) /* At 800ms. */};
    xTask3Parameters[0] = xTask0Parameters;
    xTask3Parameters[1] = xTask1Parameters;
    xTask3Parameters[2] = xTask2Parameters;

    uint8_t SW1 = 1;
    uint8_t lastSW1 = 0;
    uint8_t SW2 = 1;
    uint8_t lastSW2 = 0;
    uint8_t SW3 = 1;
    uint8_t lastSW3 = 0;

    uint8_t state[3];
    state[0] = 0;
    state[1] = 0;
    state[2] = 0;

    int index = 0;
    int i = 0;
    //int j = 0;
    //int k = 0;
    int a = 0;
    while (1)
    {
        i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
        switch(state[0])
        {
            case IDLE:
                if(i & BIT_6)
                {
                    state[0] = IDLE; // no change
                }
                else
                {
                    state[0] = DB1;
                }
                vTaskDelay(10);
                break;
            case DB1:
                if(i & BIT_6)
                {
                    state[0] = IDLE;
                }
                else
                {
                    state[0] = PRESSED;
                }
                break;
            case PRESSED:
                //start a task
                if(index < 3) // max of 3 tasks
                {
                       xTaskCreate(taskToggleAnLED,
                        "LED1",
                        configMINIMAL_STACK_SIZE,
                        (void *) &xTask3Parameters[index],
                        1,
                        &xHandle[index]);
                        configASSERT( xHandle[index] );
                    index++;
                }
                state[0] = HOLD;
                break;
            case HOLD:
                if(i & BIT_6)
                {
                    state[0] = DB2;
                }
                else
                {
                    state[0] = HOLD; // no change
                }
                vTaskDelay(10);
                break;
            case DB2:
                if(i & BIT_6)
                {
                    state[0] = IDLE;
                }
                else
                {
                    state[0] = HOLD;
                }
                break;
            default:
                state[0] = IDLE;
        }
        /*
        i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
        //j = mPORTDReadBits(BIT_7);
        //k = mPORTDReadBits(BIT_13);
        //check for button presses
        if((i & BIT_6) != lastSW1 )
        {
            //button not pressed
            
        }
        else
        {
            vTaskDelay(10);
            i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
            if((i & BIT_6) != lastSW1 )
            {

            }
            else
            {
                lastSW1 = (i & BIT_6);
                //button pressed
                if(lastSW1 == 0)
                {
                    //start a task
                    if(index < 3) // max of 3 tasks
                    {
                           xTaskCreate(taskToggleAnLED,
                            "LED1",
                            configMINIMAL_STACK_SIZE,
                            (void *) &xTask3Parameters[index],
                            1,
                            &xHandle[index]);
                            configASSERT( xHandle[index] );
                        index++;
                    }
                }
                else
                {
                    //button release
                }
            }
        }

        if((i & BIT_7) != 0 )
        {
            //button not pressed
            a = 1;
        }
        else
        {
            //button pressed
            a = 0;
        }

        if((i & BIT_13) != 0 )
        {
            //button not pressed
            a = 1;
        }
        else
        {
            //button pressed
            a = 0;
        }

         */
        //debounce button press

        vTaskDelay(100);
    }
}
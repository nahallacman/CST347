
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

#include <FreeRTOS.h>
#include "task.h"
#include "queue.h"

#include <plib.h>

#include "uartdrv.h"

/*-----------------------------------------------------------*/
/* Structures used by this demo.                             */
/*-----------------------------------------------------------*/
/* The structure that is passed into tasks that use the prvToggleAnLED() task function.
 The structure lets the task know which LED to toggle, and at which rate. */
typedef struct xTASK_PARAMETER {
    uint16_t usLEDNumber;                   /* The number of the LED to toggle. */
    portTickType xToggleRate;               /* The rate at which the LED should be toggle. */
} xTaskParameter_t;


//cals tasks
static void taskmyLeds(void *pvParameters);

/* A task that toggles an LED at a fixed frequency.  This time, the LED to
toggle and the rate at which the LED is toggled are passed into the task
using the task parameter.  This allows the same task function to be used to
create multiple tasks that each behave slightly differently. */
static void taskToggleAnLED(void *pvParameters);


//extern static void taskmyLeds(void *pvParameters);
static void taskSystemControl(void *pvParameters);

//task for UART control
static void taskUARTControl(void *pvParameters);

#ifdef	__cplusplus
}
#endif

#endif	/* MYTASKS_H */

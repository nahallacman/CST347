
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

    /* cals includes */
enum state_enum{
    IDLE = 0,
    DB1,
    PRESSED,
    HOLD,
    DB2
};

//Why do we use an enum if the size isn't defined?
enum led_dir{
    NONE = 0,
    INCR,
    DECR
};

/*-----------------------------------------------------------*/
/* Structures used by this demo.                             */
/*-----------------------------------------------------------*/
/* The structure that is passed into tasks that use the prvToggleAnLED() task function.
 The structure lets the task know which LED to toggle, and at which rate. */
typedef struct xTASK_PARAMETER {
    uint16_t usLEDNumber;                   /* The number of the LED to toggle. */
    portTickType xToggleRate;               /* The rate at which the LED should be toggle. */
} xTaskParameter_t;

struct /* __attribute__ ((packed)) */AMessage
 {
    uint8_t ucMessageID;
    enum led_dir dirrection;
    //char ucData[ 20 ];
 } xMessage;

 struct /*__attribute__ ((packed)) */UARTMessage
 {
     uint8_t ucMessageID;
     char ucMessage[20];
 } xUARTMessage;


//cals tasks
static void taskmyLeds(void *pvParameters);

/* A task that toggles an LED at a fixed frequency.  This time, the LED to
toggle and the rate at which the LED is toggled are passed into the task
using the task parameter.  This allows the same task function to be used to
create multiple tasks that each behave slightly differently. */
static void taskToggleAnLED(void *pvParameters);

static void OLDtaskToggleAnLED(void *pvParameters);


//extern static void taskmyLeds(void *pvParameters);
static void taskSystemControl(void *pvParameters);

//task for UART transmit control
static void taskUARTTXControl(void *pvParameters);

//task for UART recieve control
static void taskUARTRXControl(void *pvParameters);

//sets up the system control tasks
//and queues
static void SystemControlSetup();


uint8_t lockout[3];

void createTaskMessageSendToBack(struct UARTMessage);
#ifdef	__cplusplus
}
#endif

#endif	/* MYTASKS_H */

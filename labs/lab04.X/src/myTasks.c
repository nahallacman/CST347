#include "myTasks.h"

/*-----------------------------------------------------------*/
/* Variables used by this demo.                              */
/*-----------------------------------------------------------*/
/* Create an xTaskParameters_t structure for each of the two tasks that are
created using the prvToggleAnLED() task function. */
static const xTaskParameter_t xTask0Parameters = {0 /* Toggle LED1 */, (800 / portTICK_RATE_MS) /* At 800ms. */};
static const xTaskParameter_t xTask1Parameters = {1 /* Toggle LED2 */, (400 / portTICK_RATE_MS) /* At 400ms. */};
static const xTaskParameter_t xTask2Parameters = {2 /* Toggle LED3 */, (150 / portTICK_RATE_MS) /* At 150ms. */};





static const char LED1MESSAGE[] = "LED 1 ISNOW ACTIVE\n\r";
static const char LED2MESSAGE[] = "LED 2 ISNOW ACTIVE\n\r ";
static const char LED3MESSAGE[] = "LED 3 ISNOW ACTIVE\n\r ";
static const char LEDSTARTMESSAGE[] = "LED # STARTING    \n\r";
static const char LEDBLOCKMESSAGE[] = "LED # BLOCKING    \n\r ";
//static const char LED3MESSAGE[] = "LED 3 ISNOW ACTIVE\n\r ";
static const char MAINCONTROLSTART[] = "Main Control Start\n\r";
static const char MAINCONTROLBLOCK[] = "Main Control Block\n\r";

//task handles for the switch control tasks
TaskHandle_t xControlHandle[3];
//task handles for the LED control tasks
TaskHandle_t xLEDHandle[3];
//index for which handle is currently being used.
int currentHandle;

QueueHandle_t xQueue[3];


void SystemControlSetup()
{
    xTaskParameter_t xTask3Parameters[3];
    xTask3Parameters[0] = xTask0Parameters;
    xTask3Parameters[1] = xTask1Parameters;
    xTask3Parameters[2] = xTask2Parameters;

    UBaseType_t uxQueueLength = 5;
    UBaseType_t uxItemSize;

    uxItemSize = sizeof(xMessage);
/*
    for(currentHandle = 0; currentHandle < 3; currentHandle++)
    {


        // null out the handle just in case
        if( xLEDHandle[currentHandle] == NULL )
        {
        //create the corresponding LED task
        xTaskCreate(taskToggleAnLED,
                            "LED1",
                            configMINIMAL_STACK_SIZE,
                            (void *) &xTask3Parameters[currentHandle],
                            1,
                            &xLEDHandle[currentHandle]);

                            configASSERT( xLEDHandle[currentHandle] );
       }

       if( xQueue[currentHandle] == NULL )
       {
       xQueue[currentHandle] = xQueueCreate
                  (
                     uxQueueLength,
                     uxItemSize
                  );
       }


    }
*/

            // null out the handle just in case
        if( xLEDHandle[currentHandle] == NULL )
        {
        //create the corresponding LED task
        xTaskCreate(taskToggleAnLED,
                            "LED1",
                            configMINIMAL_STACK_SIZE,
                            (void *) &xTask0Parameters,
                            1,
                            &xLEDHandle[currentHandle]);

                            configASSERT( xLEDHandle[currentHandle] );
       }

       if( xQueue[currentHandle] == NULL )
       {
       xQueue[currentHandle] = xQueueCreate
                  (
                     uxQueueLength,
                     uxItemSize
                  );
       }


    currentHandle++;

        // null out the handle just in case
        if( xLEDHandle[currentHandle] == NULL )
        {
        //create the corresponding LED task
        xTaskCreate(taskToggleAnLED,
                            "LED1",
                            configMINIMAL_STACK_SIZE,
                            (void *) &xTask1Parameters,
                            1,
                            &xLEDHandle[currentHandle]);

                            configASSERT( xLEDHandle[currentHandle] );
       }

       if( xQueue[currentHandle] == NULL )
       {
       xQueue[currentHandle] = xQueueCreate
                  (
                     uxQueueLength,
                     uxItemSize
                  );
       }

        currentHandle++;

        // null out the handle just in case
        if( xLEDHandle[currentHandle] == NULL )
        {
        //create the corresponding LED task
        xTaskCreate(taskToggleAnLED,
                            "LED1",
                            configMINIMAL_STACK_SIZE,
                            (void *) &xTask2Parameters,
                            1,
                            &xLEDHandle[currentHandle]);

                            configASSERT( xLEDHandle[currentHandle] );
       }

       if( xQueue[currentHandle] == NULL )
       {
       xQueue[currentHandle] = xQueueCreate
                  (
                     uxQueueLength,
                     uxItemSize
                  );
       }


     //once everything is set up, reset the currentHandle index
        currentHandle = 0;


    lockout[0] = 0;
    lockout[1] = 0;
    lockout[2] = 0;

}


//-----------------------------------------------------------------

static void taskSystemControl(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    //TaskHandle_t xControlHandle[3];



    //uint8_t SW1 = 1;
    //uint8_t lastSW1 = 0;
    //uint8_t SW2 = 1;
    //uint8_t lastSW2 = 0;
    //uint8_t SW3 = 1;
    //uint8_t lastSW3 = 0;

    //uint8_t paused = 0;
    uint8_t buttonState[3];
    buttonState[0] = 0;
    buttonState[1] = 0;
    buttonState[2] = 0;

    //int index = 0;
    int i = 0;
    //int j = 0;
    //int k = 0;
    int a = 0;

    uint8_t MessageID = 1;
    enum led_dir DIR = INCR;

    
    //START INIT. don't forget to move this later!
    

    struct AMessage Message1 = { MessageID, DIR };
    Message1.dirrection = DIR;
    Message1.ucMessageID = MessageID;


 
    //int i;
    int j;

    uint8_t ucMessageID = 1;
    char ucMessage[20];
    struct UARTMessage Message2 = { ucMessageID, ucMessage };
    //struct UARTMessage Message1 = { ucMessageID, *LED1MESSAGE };

    uint8_t ucMessageID2 = 2;
    char ucMessageString[20];
    struct UARTMessage MessageMainControlStart = { ucMessageID2, ucMessageString };
    uint8_t ucMessageID3 = 3;
    char ucMessageString2[20];
    struct UARTMessage MessageMainControlBlock = { ucMessageID3, ucMessageString2 };



    while (1)
    {
        //TODO
        //print MainControl Starting
        //could replace the value 20 with a strlen() but I have to build it
        for(j = 0; j < 20 & MAINCONTROLSTART[j] != 0; j++)
        {
            MessageMainControlStart.ucMessage[j] = MAINCONTROLSTART[j];
        }
        MessageMainControlStart.ucMessage[j] = 0;
        if( xQueueSendToBack(
                               xUARTQueue, //QueueHandle_t xQueue,
                               &MessageMainControlStart, //const void * pvItemToQueue,
                               0 //TickType_t xTicksToWait
                           ) != pdPASS )
                {
                    //task was not able to be created after the xTicksToWait
                    //a = 0;
                }



        i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
        switch(buttonState[0])
        {
            case IDLE:
                if(i & BIT_6)
                {
                    buttonState[0] = IDLE; // no change
                }
                else
                {
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_6)
                    {
                        buttonState[0] = IDLE;
                    }
                    else
                    {
                        buttonState[0] = PRESSED;
                    }
                    //    state[0] = DB1;
                }
                break;
            case PRESSED:
                DIR = DECR;
                Message1.dirrection = DIR;
                if( xQueueSendToBack(
                               xQueue[currentHandle], //QueueHandle_t xQueue,
                               &Message1, //const void * pvItemToQueue,
                               0 //TickType_t xTicksToWait
                           ) != pdPASS )
                {
                    //task was not able to be created after the xTicksToWait
                    a = 0;
                }
                else
                {   //task was created successfully
                    a = 0;
                }
                buttonState[0] = HOLD;
                break;
            case HOLD:
                if(i & BIT_6)
                {
                    //state[0] = DB2;
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_6)
                    {
                        buttonState[0] = IDLE;
                    }
                    else
                    {
                        buttonState[0] = HOLD;
                    }
                }
                else
                {
                    buttonState[0] = HOLD; // no change
                }
                break;
            default:
                buttonState[0] = IDLE;
        }

        switch(buttonState[1])
        {
            case IDLE:
                if(i & BIT_7)
                {
                    buttonState[1] = IDLE; // no change
                }
                else
                {
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_7)
                    {
                        buttonState[1] = IDLE;
                    }
                    else
                    {
                        buttonState[1] = PRESSED;
                    }
                }
                break;
            case PRESSED:
                DIR = INCR;
                Message1.dirrection = DIR;
                if( xQueueSendToBack(
                               xQueue[currentHandle], //QueueHandle_t xQueue,
                               &Message1, //const void * pvItemToQueue,
                               0 //TickType_t xTicksToWait
                           ) != pdPASS )
                {
                    //task was not able to be created after the xTicksToWait
                    a = 0;
                }
                else
                {   //task was created successfully
                    a = 0;
                }
                buttonState[1] = HOLD;
                break;
            case HOLD:
                if(i & BIT_7)
                {
                    //state[0] = DB2;
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_7)
                    {
                        buttonState[1] = IDLE;
                    }
                    else
                    {
                        buttonState[1] = HOLD;
                    }
                }
                else
                {
                    buttonState[1] = HOLD; // no change
                }

                break;
            default:
                buttonState[1] = IDLE;
        }

        switch(buttonState[2])
        {
            case IDLE:
                if(i & BIT_13)
                {
                    buttonState[2] = IDLE; // no change
                }
                else
                {
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_13)
                    {
                        buttonState[2] = IDLE;
                    }
                    else
                    {
                        buttonState[2] = HOLD;
                    }
                }
                break;
            case HOLD:
                if(i & BIT_13)
                {
                    //state[0] = DB2;
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_13)
                    {
                        buttonState[2] = IDLE;
                        //if((lockout[0] | lockout[1] |  lockout[2]) == 0)
                        //{

                            if(currentHandle < 2)
                            {
                                currentHandle++;
                            }
                            else
                            {
                                currentHandle = 0;
                            }
                            //lockout[currentHandle] = 1;
                            switch(currentHandle)
                            {
                                case 0:
                                /*
                                for(j = 0; j < 20 & LED1MESSAGE[j] != 0; j++)
                                {
                                    Message2.ucMessage[j] = LED1MESSAGE[j];
                                }
                                Message2.ucMessage[j] = 0;
                                if( xQueueSendToBack(
                                                       xUARTQueue, //QueueHandle_t xQueue,
                                                       &Message2, //const void * pvItemToQueue,
                                                       0 //TickType_t xTicksToWait
                                                   ) != pdPASS )
                                        {
                                            //task was not able to be created after the xTicksToWait
                                            //a = 0;
                                        }
                                vTaskResume(xControlHandle[0]);
                                vTaskSuspend(xControlHandle[2]);
                                */
                                break;
                                case 1:
                                    /*
                                for(j = 0; j < 20 & LED2MESSAGE[j] != 0; j++)
                                {
                                    Message2.ucMessage[j] = LED2MESSAGE[j];
                                }
                                Message2.ucMessage[j] = 0;
                                if( xQueueSendToBack(
                                                       xUARTQueue, //QueueHandle_t xQueue,
                                                       &Message2, //const void * pvItemToQueue,
                                                       0 //TickType_t xTicksToWait
                                                   ) != pdPASS )
                                        {
                                            //task was not able to be created after the xTicksToWait
                                            //a = 0;
                                        }
                                vTaskResume(xControlHandle[1]);
                                vTaskSuspend(xControlHandle[0]);
                                */
                                break;
                                case 2:
                                /*
                                for(j = 0; j < 20 & LED3MESSAGE[j] != 0; j++)
                                {
                                    Message2.ucMessage[j] = LED3MESSAGE[j];
                                }
                                Message2.ucMessage[j] = 0;
                                if( xQueueSendToBack(
                                                       xUARTQueue, //QueueHandle_t xQueue,
                                                       &Message2, //const void * pvItemToQueue,
                                                       0 //TickType_t xTicksToWait
                                                   ) != pdPASS )
                                        {
                                            //task was not able to be created after the xTicksToWait
                                            //a = 0;
                                        }
                                vTaskResume(xControlHandle[2]);
                                vTaskSuspend(xControlHandle[1]);
                                */
                                break;
                                default:
                                    Message2.ucMessage[0] = "?";
                                    Message2.ucMessage[1] = 0;
                            }

                            
                        //}
                    }
                    else
                    {
                        buttonState[2] = HOLD;
                    }
                }
                else
                {
                    buttonState[2] = HOLD; // no change
                }

                break;
            default:
                buttonState[2] = IDLE;
        }

        //print message MainControl Blocking
        //TODO
        for(j = 0; j < 20 & MAINCONTROLBLOCK[j] != 0; j++)
        {
            MessageMainControlBlock.ucMessage[j] = MAINCONTROLBLOCK[j];
        }
        MessageMainControlBlock.ucMessage[j] = 0;
        if( xQueueSendToBack(
                               xUARTQueue, //QueueHandle_t xQueue,
                               &MessageMainControlBlock, //const void * pvItemToQueue,
                               0 //TickType_t xTicksToWait
                           ) != pdPASS )
                {
                    //task was not able to be created after the xTicksToWait
                    //a = 0;
                }


        vTaskDelay(100);
    }
}

//"driver" function
static void taskToggleAnLED(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    //portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    xTaskParameter_t a;
    xTaskParameter_t *b;
    b = &a;


    struct AMessage *pxRxedMessage;
    struct AMessage pxAllocMessage;
    uint8_t MessageIDtest = 0;
    enum led_dir led_test;

    int delay = 500;
    //int a = 0;

    pxRxedMessage = &pxAllocMessage;
    //pvParameters = &a;

    int j;

    uint8_t ucMessageID = 1;
    char ucMessage[20];
    struct UARTMessage Message2 = { ucMessageID, ucMessage };

    uint8_t ucMessageID2 = 2;
    char ucMessage2[20];
    struct UARTMessage Message3 = { ucMessageID2, ucMessage2 };

    char ucMessageNumber;
    ucMessageNumber = pxTaskParameter->usLEDNumber;

    while (1)
    {
        //TODO
        //print the led # starting message
        for(j = 0; j < 20 & LEDSTARTMESSAGE[j] != 0; j++)
        {
            Message2.ucMessage[j] = LEDSTARTMESSAGE[j];
        }
        if(pxTaskParameter->usLEDNumber == 0)
        {
            Message2.ucMessage[4] = LED1MESSAGE[4];
        }
        else if(pxTaskParameter->usLEDNumber == 1)
        {
            Message2.ucMessage[4] = LED2MESSAGE[4];
        }
        else if(pxTaskParameter->usLEDNumber == 2)
        {
            Message2.ucMessage[4] = LED3MESSAGE[4];
        }
                                Message2.ucMessage[j] = 0;
                                if( xQueueSendToBack(
                                                       xUARTQueue, //QueueHandle_t xQueue,
                                                       &Message2, //const void * pvItemToQueue,
                                                       0 //TickType_t xTicksToWait
                                                   ) != pdPASS )
                                        {
                                            //task was not able to be created after the xTicksToWait
                                            //a = 0;
                                        }




        /* Note the time before entering the while loop.  xTaskGetTickCount()
        is a FreeRTOS API function. */
        //xStartTime = xTaskGetTickCount();

        /* Loop until pxTaskParameters->xToggleRate ticks have */
        //while ((xTaskGetTickCount() - xStartTime) < pxTaskParameter->xToggleRate);

       

        if(xQueue[pxTaskParameter->usLEDNumber] != 0) // make sure the task isn't null
        {
            if( uxQueueMessagesWaiting( xQueue[pxTaskParameter->usLEDNumber] ) != 0 )
            {
                if( xQueueReceive( xQueue[pxTaskParameter->usLEDNumber], ( pxRxedMessage ), ( TickType_t ) 0 ) )
                {
                    // pcRxedMessage now points to the struct AMessage variable posted
                    // by vATask.
                    MessageIDtest = pxRxedMessage->ucMessageID;
                    led_test = pxRxedMessage->dirrection;

                    if(led_test == INCR)
                    {
                        if(delay < 1000)
                        {
                            delay += 50;
                        }
                    }
                    else if(led_test == DECR)
                    {
                        if( delay > 201) // 200? 201? 250?
                        {
                            delay -= 50;
                        }
                    }
                    else
                    {
                        //bad data
                    }
                }
                else
                {
                    //a = 0;
                }
            }
        }

        toggleLED(pxTaskParameter->usLEDNumber);

        //TODO
        //print the LED # Blocking message
       for(j = 0; j < 20 & LEDBLOCKMESSAGE[j] != 0; j++)
                                {
                                    Message3.ucMessage[j] = LEDBLOCKMESSAGE[j];
                                }
        if(pxTaskParameter->usLEDNumber == 0)
        {
            Message3.ucMessage[4] = LED1MESSAGE[4];
        }
        else if(pxTaskParameter->usLEDNumber == 1)
        {
            Message3.ucMessage[4] = LED2MESSAGE[4];
        }
        else if(pxTaskParameter->usLEDNumber == 2)
        {
            Message3.ucMessage[4] = LED3MESSAGE[4];
        }
                                
        Message3.ucMessage[j] = 0;
        if( xQueueSendToBack(
                               xUARTQueue, //QueueHandle_t xQueue,
                               &Message3, //const void * pvItemToQueue,
                               0 //TickType_t xTicksToWait
                           ) != pdPASS )
                {
                    //task was not able to be created after the xTicksToWait
                    //a = 0;
                }

        //try to delay the task for 500 ms
        vTaskDelay(delay);
    }
}

static void taskUARTControl(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    struct UARTMessage *pxRxedMessage;
    struct UARTMessage Message2;
    pxRxedMessage = &Message2;



    while(1)
    {
        //UART handling code
        if(xUARTQueue != 0) // make sure the task isn't null
        {
            if( uxQueueMessagesWaiting( xUARTQueue ) != 0 ) // see if there are messages waiting
            {
                if( xQueueReceive( xUARTQueue, ( pxRxedMessage ), portMAX_DELAY ) ) // get the messages
                {
                    vUartPutStr(UART2, pxRxedMessage->ucMessage, 20);
                    //void vUartPutStr(UART_MODULE umPortNum, char *pString, int iStrLen);
                }
            }
       }





        vTaskDelay(10);
    }

}
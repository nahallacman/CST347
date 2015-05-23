#include "myTasks.h"

/*-----------------------------------------------------------*/
/* Variables used by this demo.                              */
/*-----------------------------------------------------------*/
/* Create an xTaskParameters_t structure for each of the two tasks that are
created using the prvToggleAnLED() task function. */
static const xTaskParameter_t xTask0Parameters = {0 /* Toggle LED1 */, (200 / portTICK_RATE_MS) /* At 800ms. */};
static const xTaskParameter_t xTask1Parameters = {1 /* Toggle LED2 */, (200 / portTICK_RATE_MS) /* At 400ms. */};
static const xTaskParameter_t xTask2Parameters = {2 /* Toggle LED3 */, (200 / portTICK_RATE_MS) /* At 150ms. */};

static const int UARTTXTASKPRIORITY = 2;
static const int UARTRXTASKPRIORITY = 3;
//static const int MAINCONTROLTASKPRIORITY = 1;
static const int LEDTASKPRIORITY = 1;
//static const int LED1TASKPRIORITY = 5;
//static const int LED2TASKPRIORITY = 4;
//static const int LED3TASKPRIORITY = 3;




//static const char LED1MESSAGE[] = "LED 1 ISNOW ACTIVE\n\r";
//static const char LED2MESSAGE[] = "LED 2 ISNOW ACTIVE\n\r ";
//static const char LED3MESSAGE[] = "LED 3 ISNOW ACTIVE\n\r ";
//static const char LEDSTARTMESSAGE[] = "LED # STARTING    \n\r";
//static const char LEDBLOCKMESSAGE[] = "LED # BLOCKING    \n\r ";
//static const char LED3MESSAGE[] = "LED 3 ISNOW ACTIVE\n\r ";
//static const char MAINCONTROLSTART[] = "Main Control Start\n\r";
//static const char MAINCONTROLBLOCK[] = "Main Control Block\n\r";

//task handles for the switch control tasks
//TaskHandle_t xControlHandle[3];
//TaskHandle_t xControlHandle;
//task handles for the LED control tasks
TaskHandle_t xLEDHandle[3];
//TaskHandle_t xLEDHandle;
//index for which handle is currently being used.
int currentHandle;

//QueueHandle_t xQueue[3];
QueueHandle_t xLEDQueue[3];

TaskHandle_t xButtonTask;



void SystemControlSetup()
{
    /*
    if( xButtonTask == NULL )
    {
    //create the corresponding LED task
    xTaskCreate(taskButton,
                        "LED1",
                        configMINIMAL_STACK_SIZE,
                        (void *) &xTask1Parameters,
                        1,
                        &xButtonTask);

                        configASSERT( xButtonTask );
    }
     */

    xTaskParameter_t xTask3Parameters[3];
    xTask3Parameters[0] = xTask0Parameters;
    xTask3Parameters[1] = xTask1Parameters;
    xTask3Parameters[2] = xTask2Parameters;

    UBaseType_t uxQueueLength = 5;
    UBaseType_t uxItemSize;

    uxItemSize = sizeof(xLEDMessage);

    //set up the 3 led tasks
    //for(currentHandle = 0; currentHandle < 3; currentHandle++)
    //{
        // check if handle is null
        
        if( xLEDHandle[currentHandle] == NULL )
        {
        //create the corresponding LED task
        xTaskCreate(taskToggleAnLED,
                            "LED1",
                            configMINIMAL_STACK_SIZE,
                            //(void *) &xTask3Parameters[currentHandle],
                            (void *) &xTask0Parameters,
                            LEDTASKPRIORITY,
                            &xLEDHandle[currentHandle]);

                            configASSERT( xLEDHandle[currentHandle] );
       }
       

       if( xLEDQueue[currentHandle] == NULL )
       {
       xLEDQueue[currentHandle] = xQueueCreate
                  (
                     uxQueueLength,
                     uxItemSize
                  );
       }
    //}

    currentHandle++;

        if( xLEDHandle[currentHandle] == NULL )
        {
        //create the corresponding LED task
        xTaskCreate(taskToggleAnLED,
                            "LED1",
                            configMINIMAL_STACK_SIZE,
                            //(void *) &xTask3Parameters[currentHandle],
                            (void *) &xTask1Parameters,
                            LEDTASKPRIORITY,
                            &xLEDHandle[currentHandle]);

                            configASSERT( xLEDHandle[currentHandle] );
       }


       if( xLEDQueue[currentHandle] == NULL )
       {
       xLEDQueue[currentHandle] = xQueueCreate
                  (
                     uxQueueLength,
                     uxItemSize
                  );
       }

        currentHandle++;

        if( xLEDHandle[currentHandle] == NULL )
        {
        //create the corresponding LED task
        xTaskCreate(taskToggleAnLED,
                            "LED1",
                            configMINIMAL_STACK_SIZE,
                            //(void *) &xTask3Parameters[currentHandle],
                            (void *) &xTask2Parameters,
                            LEDTASKPRIORITY,
                            &xLEDHandle[currentHandle]);

                            configASSERT( xLEDHandle[currentHandle] );
       }


       if( xLEDQueue[currentHandle] == NULL )
       {
       xLEDQueue[currentHandle] = xQueueCreate
                  (
                     uxQueueLength,
                     uxItemSize
                  );
       }

    //DONT FORGET TO RESET THE HANDLE INDEX -_-
    currentHandle = 0;

        //UART TX and RX Control tasks
        xTaskCreate(taskUARTTXControl,
            "LED1",
            configMINIMAL_STACK_SIZE,
            (void *) &xTask0Parameters,
            UARTTXTASKPRIORITY,
            &xUARTTXHandle);
       configASSERT( &xUARTTXHandle );

    xTaskCreate(taskUARTRXControl,
            "LED1",
            configMINIMAL_STACK_SIZE,
            (void *) &xTask0Parameters,
            UARTRXTASKPRIORITY,
            &xUARTRXHandle);
       configASSERT( &xUARTRXHandle );

}

static void taskButton(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    //portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    xTaskParameter_t a;
    xTaskParameter_t *b;
    b = &a;

    int ThisButtonState = 0;


    while (1)
    {
//a. ?Take? the buttonPress mutex.
        xSemaphoreTake(
                   buttonpressmutex,
                   portMAX_DELAY
               );
//b. vTaskDelay() for 10 ms to serve as a debounce delay.
        vTaskDelay(10);
//c. Read Port D pins. In addition to capturing the pin values, it clears out any Change Differences that currently exist in the module.
        ThisButtonState = mPORTDRead();
//d. Compare the Port D pin values with the global State to determine which buttons were pressed OR released.
//e. When change is detected, a button state change from 0-to-1 (button RELEASE) will ?give? the appropriate ledNAction mutex. Just to be clear, this action is performed ONLY on the release, i.e. not on PRESS. If a 1-to-0 change is detected, no ?give? action is performed.
        int test;
        test = LastButtonState & 0x2000;
        if(LastButtonState == ThisButtonState)
        {
            //nothing was actually pressed/released
        }
        else if(!( LastButtonState & 0x40 ) && (ThisButtonState & 0x40))//changes from 0 to 1, aka release
        {
            //SW 1 release detected
            xSemaphoreGive( LEDmutex[0] );
        }
        else if(!( LastButtonState & 0x80 ) && (ThisButtonState & 0x80))
        {
            //SW 2 release detected
            xSemaphoreGive( LEDmutex[1] );
        }
        else if(!( LastButtonState & 0x2000 ) && (ThisButtonState & 0x2000))
        {
            //SW 3 release detected
            xSemaphoreGive( LEDmutex[2] );
        }
//f. After the ?give? action/s is/are taken, if at all, the Global Button State is updated.
        LastButtonState = ThisButtonState;
        //Return the button press mutex (is this correct?)
        xSemaphoreGive( buttonpressmutex ) ;
//g. Finally, the Change Notification Interrupt is enabled.
        ConfigIntCN(CHANGE_INT_ON);
    }
}


//"driver" function
static void taskToggleAnLED(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    //portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    //xTaskParameter_t a;
    //xTaskParameter_t *b;
    //b = &a;

    struct LEDMessage *pxRxedMessage;
    struct LEDMessage pxAllocMessage;
    uint8_t MessageIDtest = 0;
    //enum led_dir led_test;
    int delay = 500;

    //int delay = 500;
    //int a = 0;

    pxRxedMessage = &pxAllocMessage;

    while (1)
    {
        if(xLEDQueue[pxTaskParameter->usLEDNumber] != 0) // make sure the queue isn't null
        {
            if( uxQueueMessagesWaiting( xLEDQueue[pxTaskParameter->usLEDNumber] ) != 0 )
            {
                if( xQueueReceive( xLEDQueue[pxTaskParameter->usLEDNumber], ( pxRxedMessage ), ( TickType_t ) 0 ) )
                {
                    // pcRxedMessage now points to the struct AMessage variable posted
                    // by vATask.
                    MessageIDtest = pxRxedMessage->ucMessageID;
                    //led_test = pxRxedMessage->LEDNum;
                    delay = pxRxedMessage->LEDDelay;
                }
                else
                {
                    //a = 0;
                }
            }
        }
        //no matter what, start out by toggling every 500ms
        toggleLED(pxTaskParameter->usLEDNumber);
        vTaskDelay(delay);
        
    }
}


static void taskUARTTXControl(void *pvParameters)
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
            //if( uxQueueMessagesWaiting( xUARTQueue ) != 0 ) // see if there are messages waiting
            //{
                if( xQueueReceive( xUARTQueue, ( pxRxedMessage ), portMAX_DELAY ) ) // get the messages
                {

                    //vUartPutStr(UART2, pxRxedMessage->ucMessage, 50);
                    //void vUartPutStr(UART_MODULE umPortNum, char *pString, int iStrLen);
                    UARTPutString(pxRxedMessage->ucMessage);
                }
           // }
       }





        //vTaskDelay(10);
    }

}

static void taskUARTRXControl(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    struct UARTMessage *pxRxedMessage;
    struct UARTMessage Message2;
    pxRxedMessage = &Message2;


    struct LEDMessage *pxRxedMessage2;
    struct LEDMessage pxAllocMessage;
    pxRxedMessage2 = &pxAllocMessage;

    int valid_command = 0;
/*
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
*/
    char cByte;
    UART_DATA data;

    while(1)
    {
        //take the semaphor, wait forever if it is not ready yet.
        xSemaphoreTake(
           InputByteBuffer,
           portMAX_DELAY
        );

        //get data from global variable by calling UARTGetChar()
        cByte = UARTGetChar();

        //echo it on the tx buffer by queueing a message
        Message2.ucMessage[0] = cByte;
        Message2.ucMessage[1] = 0;

        if( xQueueSendToBack(
                       xUARTQueue, //QueueHandle_t xQueue,
                       &Message2, //const void * pvItemToQueue,
                       0 //TickType_t xTicksToWait
                   ) != pdPASS )
        {
            //task was not able to be created after the xTicksToWait
            //a = 0;
        }

        /*

        //decode the character to see if it is a simple command code
        //if it is send a message with an LED number to the LED queue
        switch(cByte)
        {
            case '1':
                pxAllocMessage.LEDNum = 0;
                valid_command = 1;
                break;
            case '2':
                pxAllocMessage.LEDNum = 1;
                valid_command = 1;
                break;
            case '3':
                pxAllocMessage.LEDNum = 2;
                valid_command = 1;
                break;
            default:
                //do nothing and don't send the message to the LED queue
                valid_command = 0;
        }

        if(valid_command == 1)
        {
            if( xQueueSendToBack(
                   xLEDQueue, //QueueHandle_t xQueue,
                   &pxAllocMessage, //const void * pvItemToQueue,
                   0 //TickType_t xTicksToWait
               ) != pdPASS )
            {
            //task was not able to be created after the xTicksToWait
            //a = 0;
            }
        }

        //suspend itself
        vTaskSuspend(xUARTRXHandle);

        //when the task is resumed, the loop should make the other code happen automatically
         
         */
    }


}
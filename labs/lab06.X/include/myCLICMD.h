/* 
 * File:   myCLICMD.h
 * Author: mainuser
 *
 * Created on May 23, 2015, 12:35 PM
 */

#ifndef MYCLICMD_H
#define	MYCLICMD_H

#ifdef	__cplusplus
extern "C" {
#endif

void myCLI_init(void);

//static int delayLength;

struct LEDMessage *pxRxedMessage2;
struct LEDMessage pxAllocMessage;


#ifdef	__cplusplus
}
#endif

#endif	/* MYCLICMD_H */

